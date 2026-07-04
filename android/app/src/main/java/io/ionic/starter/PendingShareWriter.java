package io.ionic.starter;

import android.content.Context;
import java.io.File;
import java.io.FileWriter;
import org.json.JSONArray;
import org.json.JSONObject;

public final class PendingShareWriter {

    private static final String PENDING_DIR = "pending_shares";

    private PendingShareWriter() {}

    public static void write(Context context, SharePayload payload) throws Exception {
        if (payload == null || payload.isEmpty()) {
            throw new IllegalArgumentException("Nothing to capture from share");
        }

        File dir = new File(context.getFilesDir(), PENDING_DIR);
        if (!dir.exists() && !dir.mkdirs()) {
            throw new Exception("Could not create pending_shares directory");
        }

        JSONObject json = new JSONObject();
        json.put("title", payload.getTitle());

        JSONArray texts = new JSONArray();
        for (String text : payload.getTexts()) {
            texts.put(text);
        }
        json.put("texts", texts);

        JSONArray files = new JSONArray();
        for (SharePayload.ShareFile file : payload.getFiles()) {
            JSONObject fileJson = new JSONObject();
            fileJson.put("name", file.getName());
            fileJson.put("mimeType", file.getMimeType());
            fileJson.put("uri", file.getUri());
            files.put(fileJson);
        }
        json.put("files", files);

        File out = new File(dir, "share-" + System.currentTimeMillis() + ".json");
        try (FileWriter writer = new FileWriter(out)) {
            writer.write(json.toString());
        }
    }
}
