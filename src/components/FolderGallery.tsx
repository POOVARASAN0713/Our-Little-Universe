"use client";

import { useEffect, useState } from "react";

type GalleryImage = {
  src: string;
  title?: string;
  alt?: string;
};

export default function FolderGallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    fetch("/gallery/gallery.json")
      .then((response) => {
        if (!response.ok) throw new Error("Gallery manifest could not load.");
        return response.json() as Promise<GalleryImage[]>;
      })
      .then((items) => setImages(items))
      .catch(() => setImages([]));
  }, []);

  const selected = images[active];

  return (
    <section className="folder-gallery" aria-label="Our gallery">
      {selected ? (
        <>
          <div className="folder-gallery-main">
            <button
              className="gallery-arrow"
              type="button"
              onClick={() => setActive((index) => (index - 1 + images.length) % images.length)}
              aria-label="Previous image"
            >
              ‹
            </button>
            <img src={selected.src} alt={selected.alt ?? selected.title ?? "Gallery memory"} />
            <button
              className="gallery-arrow"
              type="button"
              onClick={() => setActive((index) => (index + 1) % images.length)}
              aria-label="Next image"
            >
              ›
            </button>
          </div>
          <div className="folder-gallery-caption">
            <span>{selected.title ?? "A little wonder"}</span>
            <small>{active + 1} / {images.length}</small>
          </div>
          <div className="folder-gallery-thumbs">
            {images.map((image, index) => (
              <button
                type="button"
                className={index === active ? "gallery-thumb active" : "gallery-thumb"}
                key={image.src}
                onClick={() => setActive(index)}
                aria-label={`Show ${image.title ?? `image ${index + 1}`}`}
              >
                <img src={image.src} alt="" />
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="folder-gallery-empty">
          <div className="eyebrow">Your private image gallery</div>
          <h2>Add images to our gallery</h2>
          <p>
            Put images in <code>public/gallery</code>, then add their filenames to
            <code> public/gallery/gallery.json</code>.
          </p>
        </div>
      )}
    </section>
  );
}
