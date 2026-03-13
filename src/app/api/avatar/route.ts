import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  // Verify authenticated user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó archivo" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Solo se permiten archivos de imagen" }, { status: 400 });
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "El archivo no puede superar los 2 MB" }, { status: 400 });
    }

    const serviceClient = await createServiceClient();

    // Ensure bucket exists — createBucket returns error if it already exists, which is fine
    const { error: bucketError } = await serviceClient.storage.createBucket("avatars", {
      public: true,
      fileSizeLimit: 2 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    });

    // Only log if it's NOT a "already exists" error
    if (bucketError && !bucketError.message?.includes("already exists")) {
      console.error("Bucket creation error:", bucketError);
    }

    // Delete old avatar files for this user (clean up) — ignore errors
    try {
      const { data: existingFiles } = await serviceClient.storage
        .from("avatars")
        .list(user.id);

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map((f) => `${user.id}/${f.name}`);
        await serviceClient.storage.from("avatars").remove(filesToDelete);
      }
    } catch (cleanupErr) {
      console.warn("Cleanup old avatars failed (non-critical):", cleanupErr);
    }

    // Upload new file
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `${user.id}/${Date.now()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await serviceClient.storage
      .from("avatars")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", JSON.stringify(uploadError));
      return NextResponse.json(
        { error: "Error al subir el archivo" },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = serviceClient.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Update profile with new avatar URL
    const { error: updateError } = await serviceClient
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);

    if (updateError) {
      console.error("Profile update error:", JSON.stringify(updateError));
      return NextResponse.json(
        { error: "Error al actualizar perfil" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error("Avatar upload error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
