const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const app = express();
const port = 3000;

app.use(cors()); // Enable CORS for all routes
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // To parse URL-encoded data

app.post('/download', (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).send('URL is required');
    }

    const ytdlpPath = path.resolve(__dirname, 'yt-dlp.exe'); // Ensure yt-dlp is installed and accessible in your PATH
    const command = `${ytdlpPath} -g ${url}`; // -g option to get the direct download link

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return res.status(500).send('Error generating download link');
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
        }
        const downloadLink = stdout.trim();
        res.send(`You can download the video from <a href="${downloadLink}" target="_blank">here</a>.`);
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
