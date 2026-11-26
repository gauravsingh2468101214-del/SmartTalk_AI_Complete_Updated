# Media folder
Drop your real files here, then register them in `src/media.js`.

| Folder | What | Recommended |
|---|---|---|
| images/products | one photo per product | 1600x900, WebP or JPG, under 250 KB |
| images/industries | one photo per industry | 1200x1500 (4:5), WebP or JPG |
| images/blog | one cover per article | 1600x900 |
| images/projects | project photos for the trust section | 1600x900 |
| video | hero.mp4 + poster, showreel.mp4 (+ .vtt captions) | MP4 H.264, 1080p, hero under 6 MB |
| audio | optional voice note / brand story | MP3 or AAC |
| docs | datasheets and catalogue PDFs | PDF |

## Optional product media manifest
For a product slug (for example `outdoor-led-displays`), `src/media.js` can contain:

```js
'outdoor-led-displays': {
  photo: '/media/images/products/outdoor-main.webp',
  gallery: ['/media/images/products/outdoor-detail-1.webp', '/media/images/products/outdoor-detail-2.webp'],
  video: '/media/video/outdoor-demo.mp4',
  videoPoster: '/media/images/products/outdoor-video-poster.webp',
  captions: '/media/video/outdoor-demo.vtt',
  audio: '/media/audio/outdoor-demo.mp3'
}
```

All media is optional. Missing media keeps the existing animated product visual. Do not use unlicensed or unapproved client/site imagery.
