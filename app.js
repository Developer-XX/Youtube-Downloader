const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const axios = require('axios');
const app = express();
const port = 10000;

app.use(cors()); // Enable CORS for all routes
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // To parse URL-encoded data

app.post('/download', (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).send('URL is required');
    }

    const ytdlpPath = path.resolve(__dirname, 'yt-dlp.exe');// Ensure yt-dlp is installed and accessible in your PATH
    const command = `${ytdlpPath} -g --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36" ${url}`; // -g option to get the direct download link

    exec(command, async (error, stdout, stderr) => {
        if (error) {
            console.error(`Error generating download link: ${error.message}`);
            return res.status(500).send('Error generating download link');
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
        }

        const downloadLink = stdout.trim();

        // Logging to ensure we're getting the correct download link
        console.log('Generated download link:', downloadLink);

        if (!downloadLink) {
            return res.status(500).send('Failed to get a valid download link');
        }

        try {
            // Make the GET request with improved headers to avoid 403 errors
            const response = await axios.get(downloadLink, {
                responseType: 'stream',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
                    // Optional: add cookies if necessary
                    // 'Cookie': 'your_cookie_here',  // Add your session cookie if necessary
                    'Referer': 'https://www.youtube.com/', // Try adding the referer header if needed
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept': 'application/json',
                    // Additional headers might be required by the target server.
                },
            });

            // Log the response status and headers for further debugging
            console.log('Response Status:', response.status);
            console.log('Response Headers:', response.headers);

            // Set the headers for the download response
            res.setHeader('Content-Disposition', 'attachment; filename="video.mp4"');
            response.data.pipe(res);
        } catch (err) {
            // Enhanced error logging
            console.error(`Error fetching video: ${err.message}`);

            if (err.response) {
                console.error('Response Data:', err.response.data);
                console.error('Response Status:', err.response.status);
                console.error('Response Headers:', err.response.headers);
            } else {
                console.error('Error Details:', err);
            }

            res.status(500).send('Error fetching video');
        }
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
