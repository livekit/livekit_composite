import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'package:livekit_server_sdk/livekit_server_sdk.dart';

class ConnectionDetails {
  final String serverUrl;
  final String roomName;
  final String participantToken;
  final String participantName;

  ConnectionDetails({
    required this.serverUrl,
    required this.roomName,
    required this.participantToken,
    required this.participantName,
  });
}

Future<ConnectionDetails> fetchConnectionDetails(
    String identity, String roomName) async {
  await dotenv.load(fileName: ".env");

  var apiKey = dotenv.env['LIVEKIT_API_KEY'];
  var apiSecret = dotenv.env['LIVEKIT_API_SECRET'];
  var serverUrl = dotenv.env['LIVEKIT_URL'];

  print('API Key: $apiKey');
  print('API Secret: $apiSecret');
  print('Server: $serverUrl');

  final token = AccessToken(apiKey!, apiSecret!,
      options: AccessTokenOptions(
        name: 'name: $identity',
        identity: identity,
      ));

  var grant =
      VideoGrant(room: roomName, roomJoin: true, canUpdateOwnMetadata: true);
  token.addGrant(grant);
  var jwt = token.toJwt();

  ConnectionDetails connectionDetails = ConnectionDetails(
    serverUrl: serverUrl!,
    roomName: roomName,
    participantToken: jwt,
    participantName: identity,
  );

  return connectionDetails;
}
