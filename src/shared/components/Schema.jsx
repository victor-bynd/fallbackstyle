import React from 'react';

const Schema = () => {
    const schemaData = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Fallback Style",
        "applicationCategory": "DesignTool",
        "operatingSystem": "Web",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
        },
        "description": "Eliminate CLS and Tofu. Fallback Style matches fallback font metrics to your brand typefaces for a seamless, diverse, and high-performance typography experience.",
        "author": {
            "@type": "Person",
            "name": "Victor Tolosa",
            "url": "https://twitter.com/victortolosa"
        },
        "image": "https://fallback.style/opengraph-image.png",
        "url": "https://fallback.style"
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
        />
    );
};

export default Schema;
