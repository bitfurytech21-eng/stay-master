#!/usr/bin/env python3
"""Validate the manually maintained nightly-rate table.

Rates are commercial data and must never be estimated during a site build.
Edit data/rates.json only with prices approved by the business. Missing rates
are deliberately rendered as "Rate on request" throughout the website.
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.abspath(__file__))
RATES = os.path.join(ROOT, 'data', 'rates.json')
CURRENCIES = {'EUR', 'GBP', 'PLN', 'ILS', 'USD'}


def main():
    with open(RATES, encoding='utf-8') as fh:
        payload = json.load(fh)

    rates = payload.get('rates')
    if not isinstance(rates, dict):
        raise SystemExit('data/rates.json must contain a rates object.')

    count = 0
    for property_slug, units in rates.items():
        if not isinstance(property_slug, str) or not isinstance(units, dict):
            raise SystemExit('Invalid property rate entry: %r' % (property_slug,))
        for unit_name, rate in units.items():
            if not isinstance(unit_name, str) or not isinstance(rate, dict):
                raise SystemExit('Invalid unit rate entry: %r / %r' % (property_slug, unit_name))
            nightly = rate.get('nightly')
            currency = str(rate.get('currency', '')).upper()
            if isinstance(nightly, bool) or not isinstance(nightly, (int, float)) or nightly <= 0:
                raise SystemExit('Rate must be a positive number: %s / %s' % (property_slug, unit_name))
            if not re.fullmatch(r'[A-Z]{3}', currency) or currency not in CURRENCIES:
                raise SystemExit('Unsupported or missing currency: %s / %s' % (property_slug, unit_name))
            count += 1

    print('Validated %d business-approved nightly rates; no rates were generated.' % count)


if __name__ == '__main__':
    main()
