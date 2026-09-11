# The Lab — Products Decoded

Small browser experiments that are quietly satisfying to watch. Physics toys,
generative sketches and tiny games.

**Live:** https://lab.productsdecoded.com

## The one rule

**One experiment, one self-contained HTML file.** No build step, no framework,
no package to install. Open the file and it runs. `View Source` shows you the
whole thing.

That rule is the point. It means an idea can go from "what if" to deployed in an
evening, and it means adding the twelfth experiment is as cheap as adding the
second.

## Structure

```
index.html              gallery — reads the TOYS array at the bottom of the file
page.css                shared shell for the text pages only
about.html
privacy.html
t/<slug>/index.html     one experiment, fully self-contained
og/<slug>.png           1200x630 social card (optional)
```

## Adding an experiment

1. `mkdir -p t/my-thing` and drop your single `index.html` in it.
2. In the `<head>`, set the title, description, `og:` tags and canonical to
   `https://lab.productsdecoded.com/t/my-thing/`.
3. Add one entry to the `TOYS` array at the bottom of the root `index.html`:

   ```js
   {
     slug:  'my-thing',
     title: 'My Thing',
     blurb: 'One sentence on what happens when you open it.',
     tags:  ['physics', 'canvas'],
     a1:    '#ffb454',       // primary accent — colours the gallery plate
     a2:    '#53e0c8',       // secondary accent
     added: '2026-09-20'
   }
   ```

   `poster: '/og/my-thing.png'` is optional. Without it the gallery draws a
   generated plate from `a1` / `a2`, which looks deliberate rather than empty.

4. Add the URL to `sitemap.xml`.
5. Commit and push. Vercel deploys it.

## Social cards

`tools/make-og.sh <slug> "Title" "Subtitle" "#a1" "#a2"` renders a 1200x630 PNG
into `og/` using headless Chrome. Run it from the repo root.

## Deploying

Vercel, framework preset **Other**, no build command, output directory `.`
(repo root). It is a static site — there is nothing to compile.

## Licence

MIT — see [LICENSE](LICENSE). Fork one, pull it apart, rebuild it better.
