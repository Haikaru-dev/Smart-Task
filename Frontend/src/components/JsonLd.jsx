import { useEffect } from 'react';

export default function JsonLd({ data }) {
  useEffect(() => {
    // Buat elemen script
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(data);
    
    // Tambah ke dalam document head
    document.head.appendChild(script);

    // Buang bila component di unmount supaya page lain tak guna JSON-LD yang sama
    return () => {
      document.head.removeChild(script);
    };
  }, [data]);

  return null; // Komponen ini tak render apa-apa di UI
}
