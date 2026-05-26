import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request) {
  try {
    const body = await request.json();

    const { journalId, setupImages = [], referenceImages = [] } = body;

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          ok: false,
          message: "Unauthorized",
        },
        { status: 401 },
      );
    }

    async function copyImages(paths = [], type) {
      const copiedPaths = [];

      for (const oldPath of paths) {
        if (!oldPath) continue;

        const fileName = oldPath.split("/").pop();

        const newPath = `${user.id}/${journalId}/${type}/${Date.now()}-${fileName}`;

        const { error } = await supabase.storage
          .from("journal-images")
          .copy(oldPath, newPath);

        if (error) {
          throw new Error(error.message);
        }

        copiedPaths.push(newPath);
      }

      return copiedPaths;
    }

    const copiedSetupImages = await copyImages(setupImages, "setup");

    const copiedReferenceImages = await copyImages(
      referenceImages,
      "reference",
    );

    return NextResponse.json({
      ok: true,
      setupImages: copiedSetupImages,
      referenceImages: copiedReferenceImages,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error.message || "Failed to copy images",
      },
      { status: 500 },
    );
  }
}
