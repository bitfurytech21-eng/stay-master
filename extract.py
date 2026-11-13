#!/usr/bin/env python3
"""Extract structured content from the fetched live stay-master.com pages.

Reads /tmp/live/*.html and writes data/extra.json with, for each page:
  {title, h1, desc, blocks:[{t:'h1'|'h2'|'h3'|'p'|'ul'|'img', ...}]}

The live site is WordPress with several different templates, so rather than
targeting one container we strip the chrome (head, scripts, nav, header,
footer, forms) and keep the readable body in document order.
"""
import json
import os
import re
import html as H

LIVE = '/tmp/live'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'extra.json')

# chrome we never want in the extracted body
CHROME = re.compile(
    r'(?is)<(script|style|noscript|svg|nav|header|footer|form|iframe)\b[^>]*>.*?</\1>')
COMMENT = re.compile(r'(?is)<!--.*?-->')

# boilerplate headings that belong to the site chrome, not the page body
BOILER = {
    'keep in touch',
    'book directly with master and get 5% off',
    'designed for living',
    'fully-equipped kitchens',
    'prime locations',
    'dedicated service',
    'read more',
    'read less',
}

# promo-bar paragraphs that sit above the real page content
BOILER_P = {
    'welcome to',
    'master of the universe',
    'save more, stay more: book directly with master for a 5% discount today!',
}


def clean_text(x):
    x = re.sub(r'(?s)<[^>]+>', ' ', x)
    x = H.unescape(x)
    x = x.replace('\xa0', ' ')
    x = re.sub(r'\s+', ' ', x).strip()
    # the live site's own addresses must not survive into the rebuild
    x = re.sub(r'[a-zA-Z0-9._%+-]+@(?:www\.)?stay-master\.com',
               'easytravelagency@trustagent.space', x)
    return x


def body_region(s):
    """Everything between <body> and </body>, chrome stripped."""
    m = re.search(r'(?is)<body\b[^>]*>', s)
    start = m.end() if m else 0
    end = s.lower().rfind('</body>')
    if end < 0:
        end = len(s)
    frag = s[start:end]
    frag = COMMENT.sub(' ', frag)
    frag = CHROME.sub(' ', frag)
    return frag


def blocks_from(fragment):
    """Turn an HTML fragment into an ordered list of content blocks."""
    out = []
    pat = re.compile(
        r'(?is)<(h[1-4]|p|li|blockquote)\b[^>]*>(.*?)</\1>'
        r'|<img\b[^>]*?src="([^"]+)"[^>]*>'
    )
    for m in pat.finditer(fragment):
        if m.group(1):
            tag = m.group(1).lower()
            txt = clean_text(m.group(2))
            if not txt or len(txt) < 2:
                continue
            if tag in ('h1', 'h2', 'h3', 'h4') and txt.lower() in BOILER:
                continue
            if tag == 'p' and txt.lower() in BOILER_P:
                continue
            if tag == 'li' and txt.lower() in ('sign up for free', 'book directly', 'get rewarded'):
                continue
            if tag == 'li':
                if out and out[-1]['t'] == 'ul':
                    out[-1]['items'].append(txt)
                else:
                    out.append({'t': 'ul', 'items': [txt]})
            elif tag == 'blockquote':
                out.append({'t': 'p', 'text': txt})
            else:
                out.append({'t': tag, 'text': txt})
        else:
            src = m.group(3)
            if not src or src.startswith('data:'):
                continue
            out.append({'t': 'img', 'src': src})

    # drop duplicates (WP repeats blocks for mobile) and nav-ish link lists
    dedup = []
    seen = set()
    for b in out:
        key = (b['t'], b.get('text') or tuple(b.get('items') or ()) or b.get('src'))
        if key in seen:
            continue
        seen.add(key)
        dedup.append(b)
    return dedup


def page_meta(s):
    t = re.search(r'(?is)<title[^>]*>(.*?)</title>', s)
    title = clean_text(t.group(1)) if t else ''
    h1 = ''
    m = re.search(r'(?is)<h1[^>]*>(.*?)</h1>', s)
    if m:
        h1 = clean_text(m.group(1))
    d = re.search(r'(?is)<meta[^>]*name="description"[^>]*content="([^"]*)"', s)
    desc = H.unescape(d.group(1)).strip() if d else ''
    return title, h1, desc


def main():
    data = {}
    for fn in sorted(os.listdir(LIVE)):
        if not fn.endswith('.html'):
            continue
        key = fn[:-5]
        s = open(os.path.join(LIVE, fn), encoding='utf-8', errors='ignore').read()
        title, h1, desc = page_meta(s)
        bl = blocks_from(body_region(s))
        data[key] = {'title': title, 'h1': h1, 'desc': desc, 'blocks': bl}

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(data, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    print('extracted %d pages -> %s' % (len(data), OUT))
    thin = [(k, len(v['blocks'])) for k, v in data.items() if len(v['blocks']) < 3]
    print('pages with <3 blocks:', len(thin))
    for k, n in thin[:15]:
        print('   ', k, n)
    print('total blocks:', sum(len(v['blocks']) for v in data.values()))


if __name__ == '__main__':
    main()
