package io.ionic.starter;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.widget.Toast;

public class ShareReceiveActivity extends Activity {

    private static final String TAG = "ShareReceiveActivity";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Intent intent = getIntent();
        if (intent == null) {
            finish();
            return;
        }

        try {
            SharePayload payload = ShareIntentParser.parse(intent, this);

            if (payload.isEmpty()) {
                Toast.makeText(this, "Nothing to capture from share", Toast.LENGTH_SHORT).show();
                return;
            }

            PendingShareWriter.write(this, payload);
            Toast.makeText(this, payload.getToastMessage(), Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            Log.e(TAG, "Failed to handle share intent", e);
            Toast.makeText(this, "Failed to capture", Toast.LENGTH_SHORT).show();
        } finally {
            finish();
        }
    }
}
