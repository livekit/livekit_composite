import 'dart:convert';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_rpc_demo/utils.dart';
import 'package:livekit_client/livekit_client.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Demo',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const MyHomePage(title: 'Flutter Demo Home Page'),
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});
  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  List<String> _logs = [];
  void putLog(String log) {
    setState(() {
      _logs.add(log);
    });
  }

  Room? callersRoom, greetersRoom, mathGeniusRoom;

  Future<Room> connectParticipant(String identity, String roomName) async {
    final room = Room();
    var info = await fetchConnectionDetails(identity, roomName);
    final listener = room.createListener();

    listener.on<RoomDisconnectedEvent>((event) {
      putLog('$identity Disconnected from room');
    });

    await room.connect(info.serverUrl, info.participantToken,
        connectOptions: ConnectOptions(
          autoSubscribe: true,
        ));

    putLog('$identity connected.');

    return room;
  }

  Future<void> registerReceiverMethods(Room greetersRoom, Room mathGeniusRoom) {
    greetersRoom.registerRpcMethod(
      'arrival',
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (RpcInvocationData data) async {
        putLog(
            '[Greeter] Oh ${data.callerIdentity} arrived and said "${data.payload}"');

        await Future.delayed(const Duration(seconds: 2));
        return 'Welcome and have a wonderful day!';
      },
    );

    mathGeniusRoom.registerRpcMethod(
      'square-root',
      (RpcInvocationData data) async {
        final jsonData = jsonDecode(data.payload);
        final number = jsonData['number'];

        putLog(
          '[Math Genius] I guess ${data.callerIdentity} wants the square root of $number. I\'ve only got ${data.responseTimeoutMs / 1000} seconds to respond but I think I can pull it off.',
        );

        putLog('[Math Genius] *doing math*…');

        await Future.delayed(const Duration(seconds: 2));

        final result = sqrt(number);

        putLog('[Math Genius] Aha! It\'s $result');

        return jsonEncode({'result': result});
      },
    );

    mathGeniusRoom.registerRpcMethod(
      'divide',
      (RpcInvocationData data) async {
        final jsonData = jsonDecode(data.payload);
        final numerator = jsonData['numerator'];
        final denominator = jsonData['denominator'];

        putLog(
          '[Math Genius] ${data.callerIdentity} wants to divide $numerator by $denominator. I\'ll need a moment to think about this.',
        );

        await Future.delayed(const Duration(seconds: 2));

        if (denominator == 0) {
          throw Exception('Cannot divide by zero');
        }

        final result = numerator / denominator;

        putLog('[Math Genius] I have the answer: $result');

        return jsonEncode({'result': result});
      },
    );

    return Future.value();
  }

  Future<void> performGreeting(Room room) async {
    putLog("[Caller] Letting the greeter know that I've arrived");
    try {
      final response = await room.performRpc(PerformRpcParams(
        destinationIdentity: 'greeter',
        method: 'arrival',
        payload: 'Hello, I am here!',
      ));
      putLog('[Caller] That\'s nice, the greeter said: "$response"');
    } catch (error) {
      putLog('[Caller] RPC call failed: $error');
      rethrow;
    }

    return Future.value();
  }

  Future<void> performSquareRoot(Room room) async {
    putLog("[Caller] What's the square root of 16?");
    try {
      final response = await room.performRpc(
        PerformRpcParams(
          destinationIdentity: 'math-genius',
          method: 'square-root',
          payload: jsonEncode({'number': 16}),
        ),
      );

      final parsedResponse = jsonDecode(response);
      putLog('[Caller] Nice, the answer was ${parsedResponse['result']}');
    } catch (error) {
      putLog('[Caller] Unexpected error: $error');
      rethrow;
    }
  }

  Future<void> performQuantumHypergeometricSeries(Room room) async {
    putLog("[Caller] What's the quantum hypergeometric series of 42?");
    try {
      final response = await room.performRpc(
        PerformRpcParams(
          destinationIdentity: 'math-genius',
          method: 'quantum-hypergeometric-series',
          payload: jsonEncode({'number': 42}),
        ),
      );

      final parsedResponse = jsonDecode(response);
      putLog('[Caller] The math genius said: "${parsedResponse['result']}"');
    } catch (error) {
      if (error is RpcError) {
        if (error.code == RpcError.unsupportedMethod) {
          putLog('[Caller] Aww looks like the genius doesn\'t know that one.');
          return;
        }
      }
      putLog('[Caller] Unexpected error: $error');
      rethrow;
    }
  }

  Future<void> performDivision(Room room) async {
    putLog("[Caller] Let's try dividing 10 by 0");
    try {
      final response = await room.performRpc(
        PerformRpcParams(
          destinationIdentity: 'math-genius',
          method: 'divide',
          payload: jsonEncode({'numerator': 10, 'denominator': 0}),
        ),
      );

      final parsedResponse = jsonDecode(response);
      putLog('[Caller] The math genius said: "${parsedResponse['result']}"');
    } catch (error) {
      if (error is RpcError) {
        if (error.code == RpcError.applicationError) {
          putLog(
              '[Caller] Oops! I guess that didn\'t work. Let\'s try something else. The math genius said: "${error.message}"');
        } else {
          putLog('[Caller] Unexpected RPC error: $error');
        }
      } else {
        putLog('[Caller] Unexpected error: $error');
      }
    }
  }

  Future<void> performDisconnection(Room room) async {
    putLog('[Caller] Checking back in on the greeter...');
    try {
      final response = await room.performRpc(
        PerformRpcParams(
          destinationIdentity: 'greeter',
          method: 'arrival',
          payload: 'You still there?',
        ),
      );
      putLog('[Caller] That\'s nice, the greeter said: $response');
    } catch (error) {
      if (error is RpcError && error.code == RpcError.recipientDisconnected) {
        putLog('[Caller] The greeter disconnected during the request.');
      } else {
        putLog('[Caller] Unexpected error: $error');
        rethrow;
      }
    }
  }

  Future<void> disconnectAfter(Room room, int delay) async {
    await Future.delayed(Duration(milliseconds: delay));
    await room.disconnect();
  }

  void _connect() async {
    var roomName = 'test-room';
    var futures = await Future.wait([
      connectParticipant('caller', roomName),
      connectParticipant('greeter', roomName),
      connectParticipant('math-genius', roomName),
    ]);

    callersRoom = futures[0];
    greetersRoom = futures[1];
    mathGeniusRoom = futures[2];

    putLog('All participants connected, starting demo.');

    await registerReceiverMethods(greetersRoom!, mathGeniusRoom!);

    try {
      putLog('\n\nRunning greeting example...');
      await Future.wait([performGreeting(callersRoom!)]);
    } catch (error) {
      putLog('Error: $error');
    }

    try {
      putLog('\n\nRunning error handling example...');
      await Future.wait([performDivision(callersRoom!)]);
    } catch (error) {
      putLog('Error: $error');
    }

    try {
      putLog('\n\nRunning math example...');
      await Future.wait([
        performSquareRoot(callersRoom!),
        Future.delayed(const Duration(seconds: 2)),
        performQuantumHypergeometricSeries(callersRoom!),
      ]);
    } catch (error) {
      putLog('Error: $error');
    }

    try {
      putLog('\n\nRunning disconnection example...');

      await Future.wait([
        disconnectAfter(greetersRoom!, 1000),
        performDisconnection(callersRoom!)
      ]);
    } catch (error) {
      putLog('Unexpected error: $error');
    }

    putLog('participants done, disconnecting');
    await Future.wait([
      callersRoom!.disconnect(),
      greetersRoom!.disconnect(),
      mathGeniusRoom!.disconnect(),
    ]);

    putLog('\n\nParticipants disconnected. Example completed.');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        title: Text(widget.title),
      ),
      body: Center(
        child: SingleChildScrollView(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              const Text(
                'RPC Demo:',
              ),
              ..._logs.map((log) => Text(log)),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _connect,
        tooltip: 'Connect',
        child: const Icon(Icons.add),
      ),
    );
  }
}
