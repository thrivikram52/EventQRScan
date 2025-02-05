const express = require("express");
const path = require("path");
const textToSpeech = require('@google-cloud/text-to-speech');
const { exec } = require("child_process");
const fs = require("fs");
const { google } = require('googleapis');

const app = express();
const PORT = 3000;

// Configuration for audio playback
const CONFIG = {
    playOnServer: true,    // Play audio on server only
    // Add your Google Sheet ID here
    spreadsheetId: '1KQKSjK3VamUltJlmMmw21oFaLdlknxk-r7AH9m4-kvU',
    // The range where data will be appended (e.g., 'Sheet1')
    range: 'Sheet1'
};

// Initialize Google Cloud client
const client = new textToSpeech.TextToSpeechClient({
    keyFilename: './google-credentials.json'
});

// Initialize Google Sheets API
async function getGoogleSheetsClient() {
    const auth = new google.auth.GoogleAuth({
        keyFile: './alohaa-prod-dcd9abc80b20.json',
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const authClient = await auth.getClient();
    return google.sheets({ version: 'v4', auth: authClient });
}

// Function to get current IST timestamp
function getISTTimestamp() {
    const options = {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    };
    
    return new Date().toLocaleString('en-IN', options);
}

// Function to append data to Google Sheet
async function appendToSheet(data) {
    const sheets = await getGoogleSheetsClient();
    const values = [[
        data.name,
        data.mobile,
        data.email,
        data.designation,
        getISTTimestamp(),  // IST Timestamp

    ]];

    try {
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: CONFIG.spreadsheetId,
            range: CONFIG.range,
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            resource: { values }
        });
        console.log('Data appended to sheet:', response.data);
        return true;
    } catch (error) {
        console.error('Error appending to sheet:', error);
        return false;
    }
}

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

app.post("/submit-form", async (req, res) => {
    try {
        console.log("Form submitted:", req.body);
        const { name } = req.body;
        
        // Save to Google Sheet
        await appendToSheet(req.body);
        
        const welcomeText = `Hello ${name}, Welcome to our Bharath Fintech summit! Thank you for sharing your details! Our sales team will contact you soon.`;
        
        /*const request = {
            input: { text: welcomeText },
            voice: {
                languageCode: 'en-IN',
                name: 'en-IN-Standard-A',
                ssmlGender: 'FEMALE'
            },
            audioConfig: { audioEncoding: 'MP3' },
        };

        const [response] = await client.synthesizeSpeech(request);
        
        // Play audio on server
        const audioFile = path.join(__dirname, `welcome_${Date.now()}.mp3`);
        await fs.promises.writeFile(audioFile, response.audioContent, 'binary');
        */
        const audioFile = path.join(__dirname, `SharukhKhanV1.mp3`);

        
        exec(`afplay "${audioFile}"`, async (error) => {
            if (error) {
                console.error('Error playing audio on server:', error);
            }
            // Clean up file after playing
            try {
                // await fs.promises.unlink(audioFile);
            } catch (err) {
                console.error('Error cleaning up audio file:', err);
            }
        });

        // Send simple response without audio data
        res.json({ 
            message: "Welcome to our booth! Thank you for visiting."
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            message: "Error processing submission",
            error: error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    console.log(`Audio playback on server enabled`);
});
