package io.ionic.starter;

import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.webkit.MimeTypeMap;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

public final class ShareIntentParser {

    private ShareIntentParser() {}

    public static SharePayload parse(Intent intent, Context context) throws Exception {
        if (intent == null) {
            throw new IllegalArgumentException("Share intent is missing");
        }

        String action = intent.getAction();
        if (!Intent.ACTION_SEND.equals(action) && !Intent.ACTION_SEND_MULTIPLE.equals(action)) {
            throw new IllegalArgumentException("Unsupported share action: " + action);
        }

        String title = intent.getStringExtra(Intent.EXTRA_SUBJECT);
        if (title == null) {
            title = intent.getStringExtra(Intent.EXTRA_TITLE);
        }

        List<String> texts = new ArrayList<>();
        String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
        if (sharedText != null && !sharedText.trim().isEmpty()) {
            texts.add(sharedText);
        }

        List<SharePayload.ShareFile> files = new ArrayList<>();
        if (Intent.ACTION_SEND.equals(action)) {
            Uri fileUri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (fileUri != null) {
                SharePayload.ShareFile file = getFileData(context, fileUri);
                if (file != null) {
                    files.add(file);
                }
            }
        } else {
            ArrayList<Uri> fileUris = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
            if (fileUris != null) {
                for (Uri fileUri : fileUris) {
                    if (fileUri == null) {
                        continue;
                    }

                    SharePayload.ShareFile file = getFileData(context, fileUri);
                    if (file != null) {
                        files.add(file);
                    }
                }
            }
        }

        return new SharePayload(title, texts, files);
    }

    private static SharePayload.ShareFile getFileData(Context context, Uri uri) throws Exception {
        String fileName = getFileName(context, uri);
        String mimeType = context.getContentResolver().getType(uri);
        if (mimeType == null) {
            mimeType = getMimeTypeFromFileName(fileName);
        }
        if (mimeType == null) {
            mimeType = "application/octet-stream";
        }

        String filePath = copyFileToCache(context, uri, fileName);
        if (filePath == null) {
            throw new Exception("Failed to copy shared file to cache");
        }

        return new SharePayload.ShareFile(fileName, mimeType, filePath);
    }

    private static String getFileName(Context context, Uri uri) {
        String fileName = null;
        String scheme = uri.getScheme();

        if ("content".equals(scheme)) {
            try (Cursor cursor = context.getContentResolver().query(uri, null, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                    if (nameIndex != -1) {
                        fileName = cursor.getString(nameIndex);
                    }
                }
            } catch (Exception ignored) {
                // Fall back to generic name below.
            }
        } else if ("file".equals(scheme)) {
            fileName = new File(uri.getPath()).getName();
        }

        if (fileName == null || fileName.trim().isEmpty()) {
            return "shared_file_" + System.currentTimeMillis();
        }

        return fileName;
    }

    private static String getMimeTypeFromFileName(String fileName) {
        if (fileName == null) {
            return null;
        }

        int lastDot = fileName.lastIndexOf('.');
        if (lastDot <= 0 || lastDot == fileName.length() - 1) {
            return null;
        }

        String extension = fileName.substring(lastDot + 1).toLowerCase();
        return MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension);
    }

    private static String copyFileToCache(Context context, Uri uri, String fileName) throws Exception {
        File cacheDir = new File(context.getCacheDir(), "shared_files");
        if (!cacheDir.exists() && !cacheDir.mkdirs()) {
            throw new Exception("Could not create shared_files cache directory");
        }

        File outputFile = new File(cacheDir, fileName);

        try (
            InputStream inputStream = context.getContentResolver().openInputStream(uri);
            FileOutputStream outputStream = new FileOutputStream(outputFile)
        ) {
            if (inputStream == null) {
                return null;
            }

            byte[] buffer = new byte[4096];
            int bytesRead;
            while ((bytesRead = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, bytesRead);
            }
        }

        return outputFile.getAbsolutePath();
    }
}
