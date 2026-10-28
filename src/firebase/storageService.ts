import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './config';
import { StoredImage } from '../types/stock';

/**
 * Compresses an image file client-side to ensure lightweight persistent storage
 * without hitting Firestore document size thresholds.
 */
export async function compressImage(file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

/**
 * Saves an image persistently to Firestore `storedImages` collection
 */
export async function savePersistentImage(
  file: File,
  category: 'invoice' | 'damage' | 'product' | 'replacement',
  title: string
): Promise<string> {
  const imageId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const path = `storedImages/${imageId}`;

  try {
    const dataUrl = await compressImage(file);
    const imageDoc: StoredImage = {
      id: imageId,
      title,
      category,
      mimeType: 'image/jpeg',
      dataUrl,
      createdAt: new Date().toISOString()
    };

    await setDoc(doc(db, 'storedImages', imageId), imageDoc);
    return dataUrl;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Retrieves a stored image by ID
 */
export async function getPersistentImage(imageId: string): Promise<StoredImage | null> {
  const path = `storedImages/${imageId}`;
  try {
    const snap = await getDoc(doc(db, 'storedImages', imageId));
    if (snap.exists()) {
      return snap.data() as StoredImage;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}
