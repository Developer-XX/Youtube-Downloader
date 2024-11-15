from flask import Flask, render_template, request, jsonify, url_for, redirect, Response
import yt_dlp
import requests
import re
import uuid
import os

app = Flask(__name__)

# Temporary storage for download links
download_links = {}

# Route to render the main HTML page
@app.route('/')
def index():
    return render_template('index.html')

# Route to get available video formats
@app.route('/get_formats', methods=['POST'])
def get_formats():
    video_url = request.form.get('url')
    if not video_url:
        return jsonify({'error': 'No URL provided'}), 400

    try:
        ydl_opts = {'quiet': True}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
            formats = [
                {
                    'format_id': f['format_id'],
                    'resolution': f.get('format_note', 'unknown'),
                    'ext': f['ext'],
                    'has_audio': f.get('acodec') != 'none'
                }
                for f in info['formats'] if f.get('vcodec') != 'none'
            ]
            has_audio = any(f['has_audio'] for f in formats)
        return jsonify({'formats': formats, 'has_audio': has_audio})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Progress hook function to clean up .part files after download
def progress_hook(d):
    if d['status'] == 'finished':
        part_file = d['filename'] + '.part'
        if os.path.exists(part_file):
            os.remove(part_file)  # Remove .part file after download completion

# Route to create a direct download link
@app.route('/create_link', methods=['POST'])
def create_link():
    video_url = request.form.get('url')
    format_id = request.form.get('format_id')
    if not video_url or not format_id:
        return jsonify({'error': 'URL or format_id not provided'}), 400

    try:
        # Generate a unique identifier for the download link
        download_id = str(uuid.uuid4())
        download_links[download_id] = {'url': video_url, 'format_id': format_id}

        # Generate a direct download URL
        direct_download_url = url_for('download_file', download_id=download_id, _external=True)
        print(direct_download_url)
        return jsonify({'download_url': direct_download_url})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Route to handle the direct download with best audio and video merging
@app.route('/download/<download_id>')
def download_file(download_id):
    download_info = download_links.get(download_id)
    if not download_info:
        return "Invalid or expired download link.", 404

    video_url = download_info['url']
    format_id = download_info['format_id']

    try:
        # yt-dlp options to download the best video and best audio, then merge them
        ydl_opts = {
            'format': f'{format_id}+bestaudio/best',  # Select the best available video with audio
            'quiet': True,
            'progress_hooks': [progress_hook],  # Clean up .part files after download
            'outtmpl': 'downloads/%(title)s.%(ext)s',
            'merge_output_format': 'mp4',  # Ensure video and audio are merged into a single mp4 file
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=True)
            filename = ydl.prepare_filename(info).replace('.webm', ".mp4")
            safe_filename = re.sub(r'[^\w\s-]', '.', filename)  # Remove unsupported characters

        def generate():
            with open(filename, 'rb') as f:
                while chunk := f.read(8192):
                    yield chunk

        headers = {
            'Content-Disposition': f'attachment; filename="{safe_filename.encode("utf-8").decode("latin-1")}"',
            'Content-Type': 'application/octet-stream',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        }

        return Response(generate(), headers=headers)

    except Exception as e:
        return str(e), 500

if __name__ == '__main__':
    app.run(debug=True)
