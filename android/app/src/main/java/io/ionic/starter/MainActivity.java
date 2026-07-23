package io.ionic.starter;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Prefer IPv4 on devices where broken IPv6 DNS causes UnknownHostException.
        System.setProperty("java.net.preferIPv4Stack", "true");
        super.onCreate(savedInstanceState);
    }
}
