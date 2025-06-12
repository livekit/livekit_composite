import os
import requests
from bs4 import BeautifulSoup, XMLParsedAsHTMLWarning
from urllib.parse import urljoin, urlparse
import re
import json
import warnings
import shutil

# Suppress XML parsing warning
warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)

BASE_URL = "https://kb.livekit.io"
OUTPUT_DIR = "knowledge_base"

def slugify(text):
    return re.sub(r'[^a-zA-Z0-9_\-]', '_', text.strip().lower())[:60]

def try_api_endpoints():
    """Try to find API endpoints that might provide article data."""
    potential_endpoints = [
        f"{BASE_URL}/api/articles",
        f"{BASE_URL}/api/posts", 
        f"{BASE_URL}/api/docs",
        f"{BASE_URL}/sitemap.xml",
        f"{BASE_URL}/sitemap.json",
        f"{BASE_URL}/robots.txt"
    ]
    
    for endpoint in potential_endpoints:
        try:
            res = requests.get(endpoint)
            if res.status_code == 200:
                print(f"Found sitemap at: {endpoint}")
                return endpoint, res
        except Exception as e:
            continue
    
    return None, None

def get_article_links():
    """Fetch all article links from the knowledge base."""
    # First try to find API endpoints
    endpoint, api_response = try_api_endpoints()
    
    if endpoint and api_response:
        # Try to parse JSON response
        if 'json' in api_response.headers.get('content-type', ''):
            try:
                data = api_response.json()
                print(f"[DEBUG] JSON structure: {json.dumps(data, indent=2)[:500]}")
                # Extract URLs from JSON structure
                return extract_urls_from_json(data)
            except:
                pass
        
        # Try to parse XML sitemap
        if 'xml' in api_response.headers.get('content-type', '') or endpoint.endswith('.xml'):
            return extract_urls_from_sitemap(api_response.text)
    
    # Fallback to original approach
    res = requests.get(BASE_URL)
    print(f"[DEBUG] Response status: {res.status_code}")
    
    soup = BeautifulSoup(res.text, 'html.parser')
    
    # Debug: print more of the HTML to see the structure
    print(f"[DEBUG] Full HTML content: {res.text}")
    
    # Look for script tags that might contain data
    scripts = soup.find_all('script')
    print(f"[DEBUG] Found {len(scripts)} script tags")
    
    for script in scripts:
        if script.string and ('articles' in script.string.lower() or 'posts' in script.string.lower()):
            print(f"[DEBUG] Relevant script content: {script.string[:200]}")
    
    return []

def extract_urls_from_json(data):
    """Extract article URLs from JSON data."""
    urls = []
    # This would need to be customized based on the actual JSON structure
    return urls

def extract_urls_from_sitemap(xml_content):
    """Extract URLs from XML sitemap."""
    soup = BeautifulSoup(xml_content, 'html.parser')
    urls = []
    for loc in soup.find_all('loc'):
        url = loc.get_text().strip()
        if url and url != BASE_URL and url != f"{BASE_URL}/":
            urls.append(url)
    return urls

def extract_article_content(url):
    """Extract title and body content from a single article page."""
    res = requests.get(url)
    soup = BeautifulSoup(res.text, 'html.parser')

    # Extract title
    title_tag = soup.find('title')
    if not title_tag:
        print(f"[!] No title found for {url}")
        return None, None

    title = title_tag.get_text(strip=True)

    # Look for the hidden content div - it contains the actual article content
    # The content is in a div with style "height:1px; width:1px; overflow:hidden;"
    content_div = soup.find('div', style=lambda x: x and 'height:1px' in x and 'width:1px' in x and 'overflow:hidden' in x)
    
    if content_div:
        content = format_html_to_markdown(content_div)
    else:
        print(f"[!] No hidden content div found for {url}")
        # Fallback to looking for any content in the root div
        root_div = soup.find('div', id='root')
        if root_div:
            content = format_html_to_markdown(root_div)
        else:
            return None, None
    
    if not content or len(content.strip()) < 50:
        print(f"[!] Content too short or empty for {url}")
        return None, None
    
    return title, content

def format_html_to_markdown(content_div):
    """Convert HTML content to well-formatted markdown."""
    markdown_lines = []
    
    # Process elements in document order to avoid duplicates
    processed_elements = set()
    
    def process_element(element, level=0):
        # Skip if already processed or if it's a nested element we'll handle separately
        if id(element) in processed_elements:
            return
        
        processed_elements.add(id(element))
        
        if element.name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
            heading_level = int(element.name[1])
            heading_text = element.get_text(strip=True)
            if heading_text:
                markdown_lines.append(f"\n{'#' * heading_level} {heading_text}\n")
        
        elif element.name == 'p':
            text = format_inline_elements(element)
            if text and text.strip():
                markdown_lines.append(f"{text}\n")
        
        elif element.name == 'div' and element.get('data-type') == 'callout':
            # Handle callout boxes
            callout_text = format_inline_elements(element)
            if callout_text:
                markdown_lines.append(f"\n> **Note:** {callout_text}\n")
        
        elif element.name in ['ul', 'ol']:
            markdown_lines.append("")  # Add spacing before list
            for i, li in enumerate(element.find_all('li', recursive=False), 1):
                processed_elements.add(id(li))  # Mark as processed
                item_text = format_inline_elements(li)
                if item_text:
                    if element.name == 'ul':
                        markdown_lines.append(f"- {item_text}")
                    else:
                        markdown_lines.append(f"{i}. {item_text}")
            markdown_lines.append("")  # Add spacing after list
        
        elif element.name == 'pre':
            code_text = element.get_text()
            if code_text:
                markdown_lines.append(f"\n```\n{code_text}\n```\n")
        
        elif element.name == 'div' and not element.get('data-type'):
            # For regular divs, process their children
            for child in element.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'pre'], recursive=False):
                if id(child) not in processed_elements:
                    process_element(child, level + 1)
    
    # Start processing from the top level
    for element in content_div.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'div', 'pre'], recursive=False):
        process_element(element)
    
    # If no structured content was found, fall back to simple text processing
    if not markdown_lines or len(''.join(markdown_lines).strip()) < 100:
        text = content_div.get_text(separator='\n', strip=True)
        # Split into paragraphs based on double newlines and clean up
        paragraphs = [p.strip() for p in re.split(r'\n\s*\n', text) if p.strip()]
        markdown_lines = []
        for para in paragraphs:
            if para:
                # Try to identify headings (short lines that might be titles)
                if len(para) < 100 and '\n' not in para and para.endswith((':', 'Components', 'Minutes', 'Usage', 'Costs')):
                    markdown_lines.append(f"\n## {para}\n")
                else:
                    markdown_lines.append(f"{para}\n")
    
    return '\n'.join(markdown_lines).strip()

def format_inline_elements(element):
    """Format inline elements like links, bold, italic within text."""
    # Create a copy to avoid modifying the original
    element_copy = BeautifulSoup(str(element), 'html.parser').find()
    
    # Replace links with proper spacing
    for link in element_copy.find_all('a'):
        href = link.get('href', '')
        text = link.get_text().strip()
        if href and text:
            # Add space before the link if needed
            prev_text = link.previous_sibling
            if prev_text and isinstance(prev_text, str) and not prev_text.endswith(' '):
                link.insert_before(' ')
            link.replace_with(f"[{text}]({href})")
        elif text:
            link.replace_with(text)
    
    # Replace strong/bold
    for strong in element_copy.find_all(['strong', 'b']):
        text = strong.get_text().strip()
        if text:
            strong.replace_with(f"**{text}**")
    
    # Replace emphasis/italic
    for em in element_copy.find_all(['em', 'i']):
        text = em.get_text().strip()
        if text:
            em.replace_with(f"*{text}*")
    
    # Replace code
    for code in element_copy.find_all('code'):
        text = code.get_text()
        if text:
            code.replace_with(f"`{text}`")
    
    # Clean up the final text
    result = element_copy.get_text()
    # Fix multiple spaces and clean up spacing around punctuation
    result = re.sub(r'\s+', ' ', result)
    result = re.sub(r'\s+([.,;:])', r'\1', result)
    result = re.sub(r'([.,;:])\s*([a-zA-Z])', r'\1 \2', result)
    
    return result.strip()

def save_markdown(title, content):
    """Save extracted article to markdown file."""
    if not content:
        return
    filename = slugify(title) + ".md"
    filepath = os.path.join(OUTPUT_DIR, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(f"# {title}\n\n{content}")
    print(f"[+] Saved {filepath}")

def main():
    # Remove existing knowledge base directory if it exists
    if os.path.exists(OUTPUT_DIR):
        print(f"Removing existing {OUTPUT_DIR} directory...")
        shutil.rmtree(OUTPUT_DIR)
    
    # Create fresh knowledge base directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"Created fresh {OUTPUT_DIR} directory")
    
    article_urls = get_article_links()
    print(f"Found {len(article_urls)} article URLs")

    # Process all articles
    for url in article_urls:
        title, content = extract_article_content(url)
        if title and content:
            save_markdown(title, content)
    
    print(f"\n✅ Successfully downloaded {len([f for f in os.listdir(OUTPUT_DIR) if f.endswith('.md')])} articles to {OUTPUT_DIR}/")

if __name__ == "__main__":
    main()