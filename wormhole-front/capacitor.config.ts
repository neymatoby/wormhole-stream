import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.bornebit.app',
    appName: 'Bornebit',
    webDir: 'dist',
    server: {
        androidScheme: 'https'
    }
};

export default config;
