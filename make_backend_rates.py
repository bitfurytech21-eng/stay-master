#!/usr/bin/env python3
"""Generate backend/src/rates.js from data/rates.json.

Why this exists
---------------
The backend seeded every apartment at nightly_rate_minor = 0, which the booking
engine reads as "rate on request". So even with a live API, search results could
never show a price. The rates themselves already exist in data/rates.json (the
single source of truth used by the static site), but the backend is JavaScript
and cannot read that file at runtime on Render.

This script bridges the two: it reads data/rates.json and writes a plain ES
module the backend imports. Run it whenever rates change:

    python make_rates.py && python make_backend_rates.py

The generated file is committed, so the backend needs no build step and no
filesystem access to data/ at runtime.

Mapping
-------
data/rates.json is keyed by the site.json building slug ("athens/master-plaka-athens").
The backend catalog uses its own slugs ("athens-master-plaka"). The two are
matched on (city, property name) from data/site.json, normalised to a slug, so
the mapping is derived rather than hand-maintained. Any property or unit that
cannot be matched is reported and left unpriced rather than guessed.
"""

import json
import os
import re

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(ROOT, 'data', 'site.json')
RATES = os.path.join(ROOT, 'data', 'rates.json')
CATALOG = os.path.join(ROOT, 'backend', 'src', 'catalog.js')
OUT = os.path.join(ROOT, 'backend', 'src', 'rates.js')


def slugify(value):
    return re.sub(r'[^a-z0-9]+', '-', str(value).lower()).strip('-')


def parse_catalog():
    """Return (properties, units) from catalog.js without executing it."""
    src = open(CATALOG, encoding='utf-8').read()
    prop_block, unit_block = src.split('export const unitCatalog')

    properties = []
    for line in prop_block.splitlines():
        slug = re.search(r"slug:'([^']+)'", line)
        if not slug:
            continue
        name = re.search(r'name:"([^"]+)"', line) or re.search(r"name:'([^']+)'", line)
        city = re.search(r"city:'([^']+)'", line)
        if name and city:
            properties.append((slug.group(1), name.group(1), city.group(1)))

    units = []
    for line in unit_block.splitlines():
        m = re.search(r"property:'([^']+)',name:\"([^\"]+)\",maxGuests:(\d+)", line)
        if m:
            units.append((m.group(1), m.group(2), int(m.group(3))))
    return properties, units


def main():
    site = json.load(open(SITE, encoding='utf-8'))
    rates = json.load(open(RATES, encoding='utf-8'))['rates']
    properties, units = parse_catalog()

    # (city, name) -> site.json slug, which is the key used by rates.json.
    lookup = {}
    for building in site['buildings']:
        lookup[(slugify(building['city']), slugify(building['name']))] = building['slug']
        if building.get('short'):
            lookup[(slugify(building['city']), slugify(building['short']))] = building['slug']

    slug_map = {}
    for slug, name, city in properties:
        key = (slugify(city), slugify(name))
        if key in lookup:
            slug_map[slug] = lookup[key]

    table = {}
    problems = []
    for prop_slug, unit_name, _guests in units:
        rate_key = slug_map.get(prop_slug)
        if not rate_key or rate_key not in rates:
            problems.append('no rate table for property %s' % prop_slug)
            continue
        entry = rates[rate_key].get(unit_name)
        if not entry:
            problems.append('no rate for %s / %s' % (prop_slug, unit_name))
            continue
        table.setdefault(prop_slug, {})[unit_name] = {
            'nightly': int(entry['nightly']),
            'currency': entry['currency'],
        }

    priced = sum(len(v) for v in table.values())
    lines = [
        '// GENERATED FILE - do not edit by hand.',
        '// Source: data/rates.json, via make_backend_rates.py.',
        '//',
        '// Nightly rates per apartment type, keyed by the backend catalog slug.',
        '// nightly is in whole currency units (e.g. 175 GBP); the booking engine',
        '// stores minor units, so it multiplies by 100 when seeding.',
        '',
        'export const rateTable = {',
    ]
    for prop_slug in sorted(table):
        lines.append('  %r: {' % prop_slug)
        for unit_name in sorted(table[prop_slug]):
            entry = table[prop_slug][unit_name]
            lines.append(
                '    %r: { nightly: %d, currency: %r },'
                % (unit_name, entry['nightly'], entry['currency'])
            )
        lines.append('  },')
    lines.append('};')
    lines.append('')

    with open(OUT, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(lines))

    print('Wrote %s: %d properties, %d units priced'
          % (os.path.relpath(OUT, ROOT), len(table), priced))
    if problems:
        print('WARNING: %d units left unpriced:' % len(problems))
        for problem in problems:
            print('  -', problem)
        raise SystemExit(1)


if __name__ == '__main__':
    main()
