import { supabase } from "../../../lib/supabaseClient";
import {
  createDocument,
  deleteDocument,
  getDocuments,
  updateDocument,
} from "../repositories/documentRepository";

const DOCUMENT_BUCKET = "construction-documents";

export const DOCUMENT_CATEGORIES = [
  "ITP",
  "VERBALE_DL",
  "AS_BUILT",
  "DISEGNO",
  "CERTIFICATO",
  "SCHEDA_TECNICA",
  "ALTRO",
];

export async function loadActivityDocuments({ projectId, activityId }) {
  const documents = await getDocuments(projectId, activityId);

  return documents.map((document) => {
    const { data } = supabase.storage
      .from(DOCUMENT_BUCKET)
      .getPublicUrl(document.file_path);

    return {
      ...document,
      publicUrl: data?.publicUrl || "",
    };
  });
}

export async function uploadActivityDocument({
  projectId,
  activityId,
  weeklyReportId,
  file,
  category,
  title,
  description,
}) {
  if (!projectId) throw new Error("Missing project id");
  if (!activityId) throw new Error("Missing WBS activity id");
  if (!file) throw new Error("Missing document file");

  const safeName = file.name.replaceAll(" ", "-").toLowerCase();
  const filePath = `${projectId}/${activityId}/${Date.now()}-${safeName}`;

  const upload = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (upload.error) throw upload.error;

  return createDocument({
    project_id: projectId,
    wbs_activity_id: activityId,
    weekly_report_id: weeklyReportId || null,
    category: category || "ALTRO",
    version: 1,
    title: title || file.name,
    description: description || "",
    file_name: file.name,
    file_path: filePath,
    mime_type: file.type || null,
    size_bytes: file.size || null,
  });
}

export async function deleteActivityDocument(document) {
  if (!document?.id) throw new Error("Missing document id");
  if (!document?.file_path) throw new Error("Missing document file path");

  const storageDelete = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .remove([document.file_path]);

  if (storageDelete.error) throw storageDelete.error;

  await deleteDocument(document.id);

  return true;
}

export async function updateActivityDocument(documentId, values) {
  return updateDocument(documentId, {
    ...values,
    updated_at: new Date().toISOString(),
  });
}
