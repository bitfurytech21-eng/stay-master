#!/usr/bin/env python3
"""Generate 404.html using the site's own chrome, so it matches every page."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build as B  # noqa: E402

body = '''<section class="section section--tight">
  <div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="index.html">master</a><span aria-hidden="true">&gt;</span><span aria-current="page">Page not found</span></nav>
    <h1>We couldn't find that page</h1>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="prose">
      <p>The page you were looking for may have moved, or the address may be mistyped. Everything on the site is reachable from the links below.</p>
      <p>If you were looking for a specific apartment or building, start from the city pages &mdash; each one lists its buildings, and each building lists its apartments.</p>
    </div>
    <p style="margin-top:28px">
      <a class="btn-outline" href="index.html">Back to the homepage</a>
      <a class="btn-outline" href="locations.html">Browse all locations</a>
    </p>
    <p style="margin-top:22px">Still stuck? Email <a href="mailto:easytravelagency@trustagent.space">easytravelagency@trustagent.space</a> and we'll point you the right way.</p>
  </div>
</section>

%s''' % B.cta_band()

html = B.shell('Page not found | master',
               'The page you were looking for could not be found. Browse master serviced apartments by city, or contact us.',
               body)

out = os.path.join(B.ROOT, '404.html')
with open(out, 'w', encoding='utf-8') as f:
    f.write(html)
print('wrote', out, len(html), 'bytes')
