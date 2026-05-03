import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/src/lib/firebase";

type UploadIconParams = {
  uri: string;
  folder: "drink-icons" | "ingredient-icons";
  entityId: string;
  fileBaseName?: string;
};

export async function uploadIconToStorage({
  uri,
  folder,
  entityId,
  fileBaseName,
}: UploadIconParams) {
  const response = await fetch(uri);
  const blob = await response.blob();

  const safeFileBaseName = fileBaseName ?? entityId;
  const fileName = `${safeFileBaseName}_${Date.now()}.png`;
  const path = `${folder}/${entityId}/${fileName}`;

  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, blob, {
    contentType: "image/png",
    cacheControl: "public, max-age=31536000",
  });

  const iconUrl = await getDownloadURL(storageRef);

  return {
    iconUrl,
    storagePath: path,
  };
}
