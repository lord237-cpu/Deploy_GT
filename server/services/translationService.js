const OpenAI = require('openai');
const { PollyClient, SynthesizeSpeechCommand } = require('@aws-sdk/client-polly');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
require('dotenv').config();

// Convertir exec en version Promise
const execPromise = promisify(exec);

// Configuration OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Configuration AWS Polly
const polly = new PollyClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// Fonction pour transcrire l'audio avec Whisper et obtenir les timestamps
async function transcribeAudio(audioFilePath) {
    try {
        console.log('Début de la transcription avec timestamps pour:', audioFilePath);
        
        // Vérifier si le fichier existe
        if (!fs.existsSync(audioFilePath)) {
            throw new Error(`Le fichier audio n'existe pas: ${audioFilePath}`);
        }

        // Utiliser response_format=verbose_json pour obtenir les timestamps
        const response = await openai.audio.transcriptions.create({
            file: fs.createReadStream(audioFilePath),
            model: "whisper-1",
            // Utiliser 'fr' comme langue par défaut ou laisser Whisper détecter automatiquement
            // en ne spécifiant pas le paramètre language
            response_format: "verbose_json"
        });

        console.log('Transcription avec timestamps réussie');
        console.log(`Nombre de segments: ${response.segments.length}`);
        
        // Retourner à la fois le texte complet et les segments avec timestamps
        return {
            text: response.text,
            segments: response.segments.map(segment => ({
                id: segment.id,
                text: segment.text,
                start: segment.start,
                end: segment.end
            }))
        };
    } catch (error) {
        console.error('Erreur détaillée lors de la transcription:', error);
        throw new Error(`Erreur de transcription: ${error.message}`);
    }
}

// Fonction pour traduire un texte
async function translateText(text, targetLanguage) {
    try {
        console.log(`Traduction du texte vers ${targetLanguage}...`);
        
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: `Tu es un traducteur professionnel. Traduis le texte suivant en ${targetLanguage}. Garde le même ton et style. Ne change pas le sens ou le contenu.`
                },
                {
                    role: "user",
                    content: text
                }
            ],
            temperature: 0.3
        });
        
        const translatedText = completion.choices[0].message.content;
        console.log('Traduction réussie');
        return translatedText;
    } catch (error) {
        console.error('Erreur lors de la traduction:', error);
        throw new Error(`Erreur de traduction: ${error.message}`);
    }
}

// Fonction pour synthétiser la voix avec AWS Polly et contrôle du tempo via SSML
async function synthesizeSegment(text, language, desiredDuration, segmentId) {
    try {
        console.log(`Synthèse du segment ${segmentId} en ${language}, durée cible: ${desiredDuration}s`);
        
        // Estimer la durée naturelle (approximativement 3 caractères par 0.1 seconde)
        const estimatedNaturalDuration = text.length * 0.033;
        
        // Calculer le taux de parole nécessaire
        let rate = estimatedNaturalDuration / desiredDuration;
        
        // Limiter le taux pour maintenir l'intelligibilité
        if (rate > 1.5) rate = 1.5;
        if (rate < 0.5) rate = 0.5;
        
        // Formater le taux pour SSML
        let rateAttribute;
        if (rate > 1.1) {
            rateAttribute = "fast";
        } else if (rate < 0.9) {
            rateAttribute = "slow";
        } else {
            rateAttribute = "medium";
        }
        
        // Créer le texte SSML avec contrôle du tempo
        const ssmlText = `<speak><prosody rate="${rateAttribute}">${text}</prosody></speak>`;
        
        const voiceId = getVoiceIdForLanguage(language);
        const command = new SynthesizeSpeechCommand({
            Text: ssmlText,
            OutputFormat: "mp3",
            VoiceId: voiceId,
            Engine: "neural",
            TextType: "ssml"
        });

        const response = await polly.send(command);
        const outputPath = path.join(__dirname, '..', 'downloads', `segment_${segmentId}_${Date.now()}.mp3`);
        
        // Convertir le stream en fichier
        await new Promise((resolve, reject) => {
            const fileStream = fs.createWriteStream(outputPath);
            response.AudioStream.pipe(fileStream);
            fileStream.on('finish', () => {
                console.log(`Segment ${segmentId} créé avec succès:`, outputPath);
                resolve();
            });
            fileStream.on('error', (err) => {
                console.error(`Erreur lors de l'écriture du segment ${segmentId}:`, err);
                reject(err);
            });
        });

        return outputPath;
    } catch (error) {
        console.error(`Erreur lors de la synthèse du segment ${segmentId}:`, error);
        throw new Error(`Erreur de synthèse vocale: ${error.message}`);
    }
}

// Fonction pour assembler tous les segments audio en une seule piste
async function assembleAudioSegments(segments, silentAudioPath) {
    try {
        console.log('Assemblage des segments audio...');
        
        // Créer un fichier de liste pour FFmpeg
        const listFilePath = path.join(__dirname, '..', 'downloads', `segments_list_${Date.now()}.txt`);
        let listContent = '';
        
        // Trier les segments par temps de début
        segments.sort((a, b) => a.start - b.start);
        
        // Créer un fichier audio silencieux si nécessaire
        if (!silentAudioPath) {
            silentAudioPath = path.join(__dirname, '..', 'downloads', `silence_${Date.now()}.mp3`);
            await execPromise(`ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t 1 -q:a 0 "${silentAudioPath}"`);
        }
        
        // Ajouter chaque segment à la liste avec le bon timing
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            
            // Si c'est le premier segment et qu'il ne commence pas à 0, ajouter du silence au début
            if (i === 0 && segment.start > 0) {
                listContent += `file '${silentAudioPath.replace(/\\/g, '/')}'
`;
                listContent += `outpoint ${segment.start}\n`;
            }
            
            // Ajouter le segment actuel
            listContent += `file '${segment.audioPath.replace(/\\/g, '/')}'
`;
            
            // Ajouter du silence entre les segments si nécessaire
            if (i < segments.length - 1) {
                const nextSegment = segments[i + 1];
                const gap = nextSegment.start - segment.end;
                
                if (gap > 0.1) { // Seulement si l'écart est significatif
                    listContent += `file '${silentAudioPath.replace(/\\/g, '/')}'
`;
                    listContent += `outpoint ${gap}\n`;
                }
            }
        }
        
        // Écrire le fichier de liste
        fs.writeFileSync(listFilePath, listContent);
        
        // Assembler les segments avec FFmpeg
        const outputPath = path.join(__dirname, '..', 'downloads', `assembled_${Date.now()}.mp3`);
        await execPromise(`ffmpeg -f concat -safe 0 -i "${listFilePath}" -c copy "${outputPath}"`);
        
        console.log('Assemblage audio réussi:', outputPath);
        return outputPath;
    } catch (error) {
        console.error('Erreur lors de l\'assemblage audio:', error);
        throw new Error(`Erreur d'assemblage audio: ${error.message}`);
    }
}

// Fonction principale pour synthétiser la parole avec synchronisation
async function synthesizeSynchronizedSpeech(transcriptionResult, targetLanguage) {
    try {
        console.log('Début de la synthèse vocale synchronisée...');
        const segments = transcriptionResult.segments;
        const processedSegments = [];
        
        // Traiter chaque segment individuellement
        for (const segment of segments) {
            // 1. Traduire le segment
            const translatedText = await translateText(segment.text, targetLanguage);
            
            // 2. Calculer la durée du segment
            const segmentDuration = segment.end - segment.start;
            
            // 3. Synthétiser l'audio avec la durée cible
            const audioPath = await synthesizeSegment(translatedText, targetLanguage, segmentDuration, segment.id);
            
            // 4. Ajouter aux segments traités
            processedSegments.push({
                ...segment,
                translatedText,
                audioPath
            });
        }
        
        // 5. Assembler tous les segments en un seul fichier audio
        const assembledAudioPath = await assembleAudioSegments(processedSegments);
        
        console.log('Synthèse vocale synchronisée terminée');
        return {
            audioPath: assembledAudioPath,
            segments: processedSegments
        };
    } catch (error) {
        console.error('Erreur lors de la synthèse synchronisée:', error);
        throw new Error(`Erreur de synthèse synchronisée: ${error.message}`);
    }
}

// Fonction simplifiée pour la compatibilité avec le code existant
async function synthesizeSpeech(text, language) {
    try {
        console.log('Utilisation de la méthode de synthèse vocale traditionnelle');
        console.log('Texte à synthétiser:', text);

        const voiceId = getVoiceIdForLanguage(language);
        const command = new SynthesizeSpeechCommand({
            Text: text,
            OutputFormat: "mp3",
            VoiceId: voiceId,
            Engine: "neural"
        });

        const response = await polly.send(command);
        const outputPath = path.join(__dirname, '..', 'downloads', `${Date.now()}_translated.mp3`);
        
        // Convertir le stream en fichier
        await new Promise((resolve, reject) => {
            const fileStream = fs.createWriteStream(outputPath);
            response.AudioStream.pipe(fileStream);
            fileStream.on('finish', () => {
                console.log('Fichier audio créé avec succès:', outputPath);
                resolve();
            });
            fileStream.on('error', (err) => {
                console.error('Erreur lors de l\'écriture du fichier:', err);
                reject(err);
            });
        });

        return outputPath;
    } catch (error) {
        console.error('Erreur détaillée lors de la synthèse vocale:', error);
        throw new Error(`Erreur de synthèse vocale: ${error.message}`);
    }
}

// Fonction utilitaire pour obtenir la voix appropriée selon la langue
function getVoiceIdForLanguage(language) {
    const voiceMap = {
        'fr': 'Lea',
        'en': 'Joanna',
        'es': 'Lucia',
        'de': 'Vicki',
        'it': 'Bianca',
        'pt': 'Camila',
        'pl': 'Ewa',
        'nl': 'Laura'
    };
    return voiceMap[language] || 'Joanna';
}

module.exports = {
    transcribeAudio,
    synthesizeSpeech,
    synthesizeSynchronizedSpeech,
    translateText
};
