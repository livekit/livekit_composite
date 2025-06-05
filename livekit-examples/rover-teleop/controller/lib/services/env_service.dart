import 'package:flutter_dotenv/flutter_dotenv.dart';

class EnvService {
  static Future<void> init() async {
    try {
      await dotenv.load(fileName: '.env');
      print('Loaded environment variables: ${dotenv.env}');
    } catch (e) {
      // .env file doesn't exist or couldn't be loaded
      // Fallback to default values will be used
      print('Warning: .env file not found. Using default values instead.');
    }
  }

  static String get livekitUrl => dotenv.env['LIVEKIT_URL'] ?? 'wss://your-livekit-server.com';
  static String get livekitToken => dotenv.env['LIVEKIT_CONTROLLER_TOKEN'] ?? 'your-token';
} 