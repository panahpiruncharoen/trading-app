import { getDownloadURL, ref } from "firebase/storage";
import { storage } from "~/lib/firebase"

// an image that is missing (e.g. its upload never finished) is skipped, so one bad image never breaks a page
export async function getImageUrls(paths: string[] = []) {
  const urls = await Promise.allSettled(paths.map((path) => getDownloadURL(ref(storage, path))))
  return urls.flatMap((url) => url.status === "fulfilled" ? [url.value] : [])
}
