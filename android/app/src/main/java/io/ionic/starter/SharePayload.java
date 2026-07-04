package io.ionic.starter;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class SharePayload {

    private static final Pattern URL_PATTERN = Pattern.compile("https?://\\S+", Pattern.CASE_INSENSITIVE);

    private final String title;
    private final List<String> texts;
    private final List<ShareFile> files;

    public SharePayload(String title, List<String> texts, List<ShareFile> files) {
        this.title = title != null ? title : "";
        this.texts = texts != null ? new ArrayList<>(texts) : new ArrayList<>();
        this.files = files != null ? new ArrayList<>(files) : new ArrayList<>();
    }

    public String getTitle() {
        return title;
    }

    public List<String> getTexts() {
        return Collections.unmodifiableList(texts);
    }

    public List<ShareFile> getFiles() {
        return Collections.unmodifiableList(files);
    }

    public boolean isEmpty() {
        if (!files.isEmpty()) {
            return false;
        }

        for (String text : texts) {
            if (text != null && !text.trim().isEmpty()) {
                return false;
            }
        }

        return true;
    }

    public String getPrimaryText() {
        for (String text : texts) {
            if (text != null && !text.trim().isEmpty()) {
                return text.trim();
            }
        }

        return title != null ? title.trim() : "";
    }

    public String extractFirstUrl() {
        for (String text : texts) {
            if (text == null) {
                continue;
            }

            Matcher matcher = URL_PATTERN.matcher(text);
            if (matcher.find()) {
                return matcher.group();
            }
        }

        return null;
    }

    public String getToastMessage() {
        if (isEmpty()) {
            return "Nothing to capture from share";
        }

        if (extractFirstUrl() != null) {
            return "URL captured!";
        }

        if (!files.isEmpty()) {
            return files.size() == 1 ? "File captured!" : files.size() + " files captured!";
        }

        return "Note captured!";
    }

    public static final class ShareFile {

        private final String name;
        private final String mimeType;
        private final String uri;

        public ShareFile(String name, String mimeType, String uri) {
            this.name = name != null ? name : "shared_file";
            this.mimeType = mimeType != null ? mimeType : "application/octet-stream";
            this.uri = uri != null ? uri : "";
        }

        public String getName() {
            return name;
        }

        public String getMimeType() {
            return mimeType;
        }

        public String getUri() {
            return uri;
        }
    }
}
