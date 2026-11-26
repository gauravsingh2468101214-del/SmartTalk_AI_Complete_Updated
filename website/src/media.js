// MEDIA MANIFEST: the one place to plug in real photos, video and audio.
// 1) Put files in /public/media/... 2) set the path here. Anything left null keeps the built-in animated visuals.
// Recommended: photos 1600x900 WebP/JPG (<250 KB), hero video MP4 H.264 1080p 10-20 s (<6 MB) + poster image.
export const MEDIA = {
  heroVideo: { src: null, poster: null },                  // e.g. { src: '/media/video/hero.mp4', poster: '/media/images/hero.jpg' }
  showreel: { src: null, poster: null, captions: null },   // real video replaces the generated showreel. captions: '/media/video/showreel.vtt'
  products: {},    // 'outdoor-led-displays': { photo: '/media/images/products/outdoor.jpg', gallery: ['/media/images/products/outdoor-1.webp'], video: '/media/video/outdoor-demo.mp4', videoPoster: '/media/images/products/outdoor-poster.webp', captions: '/media/video/outdoor-demo.vtt', audio: '/media/audio/outdoor-demo.mp3' }
  industries: {},  // 'retail-shopping-malls': { photo: '/media/images/industries/retail.jpg' }
  blog: {}         // 'led-display-technology-explained': { photo: '/media/images/blog/tech.jpg' }
}
export const photoFor = (kind, slug) => (kind && slug && MEDIA[kind]?.[slug]?.photo) || null
