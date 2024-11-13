const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

app.use(cors()); // Enable CORS for all routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }))

app.post('/download',async (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).send('URL is required');
    }

    const outputDir = 'downloads';
    const outputFile = path.join(outputDir, '%(title)s.%(ext)s');

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    const ytdlpPath = path.resolve(__dirname, 'yt-dlp.exe'); // Full path to yt-dlp
    const command = `"${ytdlpPath}" -o "${outputFile}" ${url}`;

    await exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return res.status(500).send('Error downloading video');
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
        }
        console.log(`stdout: ${stdout}`);
        res.send('Download started');
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
