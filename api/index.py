from flask import Flask, request, jsonify, Response, stream_with_context
import requests
from bs4 import BeautifulSoup
import re
import json

app = Flask(__name__)

# Headers to mimic a real browser and avoid Meta blocking
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Sec-Fetch-Mode": "navigate",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Fetch-Site": "none",
    "Upgrade-Insecure-Requests": "1"
}

@app.route('/api/proxy')
def proxy_download():
    url = request.args.get('url')
    filename = request.args.get('filename', 'download')
    
    if not url:
        return jsonify({"error": "Missing URL"}), 400

    try:
        # Stream the content from the upstream URL
        req = requests.get(url, stream=True, headers=HEADERS, timeout=20)
        req.raise_for_status()

        # Generator to yield chunks
        def generate():
            for chunk in req.iter_content(chunk_size=8192):
                if chunk:
                    yield chunk

        # Return response with attachment header to force download
        return Response(generate(),
                        content_type=req.headers.get('content-type', 'application/octet-stream'),
                        headers={
                            'Content-Disposition': f'attachment; filename="{filename}"'
                        })
    except Exception as e:
        return jsonify({"error": f"Proxy error: {str(e)}"}), 500

@app.route('/api/download', methods=['GET'])
def download():
    url = request.args.get('url')
    
    if not url:
        return jsonify({"error": "Missing URL parameter"}), 400
        
    # Validation: Ensure it's a Threads URL
    if not re.match(r'^https?://(www\.)?threads\.(net|com)/.*', url):
        return jsonify({"error": "Invalid Threads URL"}), 400

    try:
        # Extract shortcode to ensure we match the correct post (avoids suggested posts)
        # URL format: https://www.threads.net/@user/post/SHORTCODE
        shortcode_match = re.search(r'/post/([^/?]+)', url)
        shortcode = shortcode_match.group(1) if shortcode_match else None
        print(f"DEBUG: Extracted shortcode: {shortcode}")

        # Fetch the page content
        response = requests.get(url, headers=HEADERS, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        final_video_url = None
        
        # 1. Try Standard Meta Tags First (Fastest)
        video_url_meta = soup.find("meta", property="og:video")
        video_secure_url_meta = soup.find("meta", property="og:video:secure_url")
        image_url_meta = soup.find("meta", property="og:image")
        
        if final_video_url:
            # Single video found via meta tags
            return jsonify({
                "media": [{
                    "type": "video",
                    "url": final_video_url,
                    "filename": f"threads_video_{shortcode or 'dl'}.mp4"
                }]
            })
            
        # 2. Advanced JSON Scraping (for Carousel or Hidden Video)
        print("DEBUG: Using advanced JSON scraping...")
        scripts = soup.find_all("script", type="application/json")
        for i, script in enumerate(scripts):
            if shortcode and shortcode in script.text:
                try:
                    data = json.loads(script.text)
                    
                    found_media = []

                    # Helper to extract best quality from a list of versions
                    def get_best_quality(candidates):
                         if not candidates: return None
                         # Sort by width * height
                         return max(candidates, key=lambda v: (v.get("width") or 0) * (v.get("height") or 0))

                    # 2a. Check for Carousel Media (Multiple items)
                    # We need a recursive search for 'carousel_media' similar to video_versions
                    def find_key(obj, key_name):
                        if isinstance(obj, dict):
                            if key_name in obj: return obj[key_name]
                            for k, v in obj.items():
                                res = find_key(v, key_name)
                                if res: return res
                        elif isinstance(obj, list):
                            for item in obj:
                                res = find_key(item, key_name)
                                if res: return res
                        elif isinstance(obj, str):
                            if key_name in obj:
                                try:
                                    decoded = json.loads(obj)
                                    res = find_key(decoded, key_name)
                                    if res: return res
                                except: pass
                        return None

                    carousel_items = find_key(data, "carousel_media")
                    if carousel_items and isinstance(carousel_items, list):
                        print(f"DEBUG: Found carousel with {len(carousel_items)} items")
                        for item in carousel_items:
                            # Try to extract video first
                            video_candidates = item.get("video_versions")
                            best_video = get_best_quality(video_candidates)
                            
                            if best_video and "url" in best_video:
                                found_media.append({
                                    "type": "video",
                                    "url": best_video["url"],
                                    "filename": f"threads_video_{shortcode}_{len(found_media)}.mp4"
                                })
                            else:
                                # Fallback to image if no video found
                                image_candidates = item.get("image_versions2", {}).get("candidates")
                                best_image = get_best_quality(image_candidates)
                                
                                if best_image and "url" in best_image:
                                    found_media.append({
                                        "type": "image",
                                        "url": best_image["url"],
                                        "filename": f"threads_image_{shortcode}_{len(found_media)}.jpg"
                                    })
                    
                    # 2b. If no carousel, look for single video_versions
                    if not found_media:
                        video_versions = find_key(data, "video_versions")
                        if video_versions:
                            best = get_best_quality(video_versions)
                            if best and "url" in best:
                                found_media.append({
                                    "type": "video",
                                    "url": best["url"],
                                    "filename": f"threads_video_{shortcode}.mp4"
                                })

                    if found_media:
                        print(f"DEBUG: Extracted {len(found_media)} media items from JSON")
                        return jsonify({"media": found_media})

                except json.JSONDecodeError:
                    continue

        # 3. Fallback: Meta Image (if no JSON media found)
        if image_url_meta and image_url_meta.get("content"):
            content = image_url_meta["content"]
            if "static.cdninstagram.com" not in content: # Filter generic logo
                 return jsonify({
                     "media": [{
                         "type": "image",
                         "url": content,
                         "filename": f"threads_image_{shortcode or 'dl'}.jpg"
                     }]
                 })

        return jsonify({"error": "No media found"}), 404

    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Failed to fetch Threads page: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(port=5328)
