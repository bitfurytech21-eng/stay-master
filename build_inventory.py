#!/usr/bin/env python3
"""Generate inventory.json — the static apartment inventory the search reads.

Why this exists
---------------
The booking search used to call the backend API for every search. On GitHub
Pages there is no /api proxy, and the configured API host was not running, so
"Search an Apartment" could never return anything.

The apartment list is not dynamic data: it is the real, published inventory
already held in data/site.json (13 properties, 73 apartment types). This script
turns that into a single static JSON file the browser can read directly, so
search works on any static host with no backend at all.

The API is still preferred when it is reachable (it knows live availability and
rates); inventory.json is the fallback that makes search work regardless.

Rates are deliberately absent: the site does not publish nightly rates, so a
unit is priced "on request" and the team quotes. Nothing here invents a price.
"""

import json
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(ROOT, 'data', 'site.json')
OUT = os.path.join(ROOT, 'inventory.json')

# City slug -> the display name used by the search dropdown.
CITY_NAMES = {
    'london': 'London',
    'rome': 'Rome',
    'barcelona': 'Barcelona',
    'athens': 'Athens',
    'warsaw': 'Warsaw',
    'hamburg': 'Hamburg',
    'salzburg': 'Salzburg',
    'tel-aviv': 'Tel Aviv',
    'bat-yam': 'Bat Yam',
}

# Country per city, for the result card eyebrow.
CITY_COUNTRY = {
    'london': 'United Kingdom',
    'rome': 'Italy',
    'barcelona': 'Spain',
    'athens': 'Greece',
    'warsaw': 'Poland',
    'hamburg': 'Germany',
    'salzburg': 'Austria',
    'tel-aviv': 'Israel',
    'bat-yam': 'Israel',
}


def max_guests(spec):
    """'1-4' -> 4. A single number is taken as itself."""
    text = str(spec or '').strip()
    if '-' in text:
        tail = text.split('-')[-1].strip()
        if tail.isdigit():
            return int(tail)
    digits = ''.join(ch for ch in text if ch.isdigit())
    return int(digits) if digits else 2


def slugify(name):
    """Match the slug the property pages use for their deep links."""
    out = []
    for ch in name.lower():
        if ch.isalnum():
            out.append(ch)
        else:
            out.append('-')
    slug = ''.join(out)
    while '--' in slug:
        slug = slug.replace('--', '-')
    return slug.strip('-')


def main():
    with open(SITE, encoding='utf-8') as fh:
        site = json.load(fh)

    properties = []
    for b in site['buildings']:
        city_slug = b['city']
        units = []
        for name, guests, beds, baths, sqm in b['apts']:
            units.append({
                'name': name,
                'slug': slugify(name),
                'maxGuests': max_guests(guests),
                'guestsLabel': str(guests),
                'bedrooms': beds,
                'bathrooms': baths,
                'sqm': sqm,
                # 0 means "rate on request" — the site publishes no rates.
                'nightlyRateMinor': 0,
                'currency': 'EUR',
            })
        properties.append({
            'slug': b['slug'].replace('/', '-'),
            'name': b['name'],
            'city': CITY_NAMES.get(city_slug, city_slug.title()),
            'citySlug': city_slug,
            'country': CITY_COUNTRY.get(city_slug, ''),
            'address': b['address'],
            'image': 'images/buildings/%s-01.jpg' % b['img'],
            'page': '%s.html' % b['slug'].replace('/', '-'),
            'units': units,
        })

    payload = {
        'generatedFrom': 'data/site.json',
        'note': ('Static apartment inventory. Rates are not published, so every '
                 'unit is priced on request. Live availability and rates come '
                 'from the booking API when it is reachable.'),
        'properties': properties,
    }

    with open(OUT, 'w', encoding='utf-8') as fh:
        json.dump(payload, fh, ensure_ascii=False, separators=(',', ':'))

    total_units = sum(len(p['units']) for p in properties)
    print('Wrote %s: %d properties, %d apartment types'
          % (os.path.relpath(OUT, ROOT), len(properties), total_units))


if __name__ == '__main__':
    main()
