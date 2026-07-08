import { supabase } from "../../../lib/supabaseClient";

const PHOTO_BUCKET = "construction-photos";

export async function loadActivityPhotos({ projectId, wbsActivityId }) {
  if (!projectId || !wbsActivityId) return [];

  const { data, error } = await supabase
    .from("construction_photos")
    .select("*")
    .eq("project_id", projectId)
    .eq("wbs_activity_id", wbsActivityId)
    .order("taken_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((photo) => {
    const { data: publicUrlData } = supabase.storage
      .from(PHOTO_BUCKET)
      .getPublicUrl(photo.file_path);

    return {
      ...photo,
      publicUrl: publicUrlData?.publicUrl || "",
    };
  });
}

export async function uploadActivityPhoto({
  projectId,
  wbsActivityId,
  weeklyReportId,
  file,
  description,
}) {
  if (!projectId) throw new Error("Missing project id");
  if (!wbsActivityId) throw new Error("Missing WBS activity id");
  if (!file) throw new Error("Missing photo file");

  const safeName = file.name.replaceAll(" ", "-").toLowerCase();
  const filePath = `${projectId}/${wbsActivityId}/${Date.now()}-${safeName}`;

  const upload = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (upload.error) throw upload.error;

  const insert = await supabase
    .from("construction_photos")
    .insert({
      project_id: projectId,
      wbs_activity_id: wbsActivityId,
      weekly_report_id: weeklyReportId || null,
      file_path: filePath,
      file_name: file.name,
      description: description || "",
      taken_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (insert.error) throw insert.error;

  return insert.data;
}


export async function deleteActivityPhoto(photo) {
  if (!photo?.id) throw new Error("Missing photo id");
  if (!photo?.file_path) throw new Error("Missing photo file path");

  const storageDelete = await supabase.storage
    .from(PHOTO_BUCKET)
    .remove([photo.file_path]);

  if (storageDelete.error) throw storageDelete.error;

  const dbDelete = await supabase
    .from("construction_photos")
    .delete()
    .eq("id", photo.id);

  if (dbDelete.error) throw dbDelete.error;

  return true;
}
