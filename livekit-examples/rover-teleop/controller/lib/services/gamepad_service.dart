import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:gamepads/gamepads.dart';

class GamepadService {
  static final GamepadService _instance = GamepadService._internal();
  factory GamepadService() => _instance;
  GamepadService._internal();

  final ValueNotifier<bool> isGamepadConnected = ValueNotifier<bool>(false);
  GamepadController? _activeGamepad;
  StreamSubscription<GamepadEvent>? _eventSubscription;
  final ValueNotifier<Map<String, dynamic>> controllerValues = ValueNotifier<Map<String, dynamic>>({
    'leftStickX': 0.0,
    'leftStickY': 0.0,
    'rightStickX': 0.0,
    'rightStickY': 0.0,
    'leftTrigger': 0.0,
    'rightTrigger': 0.0,
    'buttonA': false,
    'buttonB': false,
    'buttonX': false,
    'buttonY': false,
    'dpadUp': false,
    'dpadDown': false,
    'dpadLeft': false,
    'dpadRight': false,
    'leftShoulder': false,
    'rightShoulder': false,
  });

  Future<void> initialize() async {
    try {
      print('Initializing gamepad service');
      
      // Check for connected gamepads
      await _checkForConnectedGamepads();
      
      // Setup event listeners
      _setupListeners();
    } catch (error) {
      print('Error initializing gamepad service: $error');
    }
  }

  void _setupListeners() {
    // Listen to gamepad events
    _eventSubscription = Gamepads.events.listen(_handleGamepadEvent);
  }

  Future<void> _checkForConnectedGamepads() async {
    final connectedGamepads = await Gamepads.list();
    if (connectedGamepads.isNotEmpty) {
      _activeGamepad = connectedGamepads.first;
      isGamepadConnected.value = true;
      print('Found connected gamepad: ${_activeGamepad!.name}');
    } else {
      print('No gamepads connected');
    }
  }

  void _handleGamepadEvent(GamepadEvent event) {
    // Update state based on the event
    if (_activeGamepad != null && event.gamepadId == _activeGamepad!.id) {
      _updateValuesFromEvent(event);
    }
  }

  void _updateValuesFromEvent(GamepadEvent event) {
    final values = Map<String, dynamic>.from(controllerValues.value);
    
    // Handle button and axis values based on the key and type
    switch (event.key) {
      case 'l.joystick - xAxis':
        values['leftStickX'] = event.value;
        break;
      case 'l.joystick - yAxis':
        values['leftStickY'] = event.value;
        break;
      case 'r.joystick - xAxis':
        values['rightStickX'] = event.value;
        break;
      case 'r.joystick - yAxis':
        values['rightStickY'] = event.value;
        break;
      // case 'a':
      // case 'button_0':
      //   values['buttonA'] = event.value > 0.5;
      //   break;
      // case 'b':
      // case 'button_1':
      //   values['buttonB'] = event.value > 0.5;
      //   break;
      // case 'x':
      // case 'button_2':
      //   values['buttonX'] = event.value > 0.5;
      //   break;
      // case 'y':
      // case 'button_3':
      //   values['buttonY'] = event.value > 0.5;
      //   break;
      // case 'left_shoulder':
      // case 'button_4':
      //   values['leftShoulder'] = event.value > 0.5;
      //   break;
      // case 'right_shoulder':
      // case 'button_5':
      //   values['rightShoulder'] = event.value > 0.5;
      //   break;
      // case 'dpad_up':
      // case 'button_12':
      //   values['dpadUp'] = event.value > 0.5;
      //   break;
      // case 'dpad_down':
      // case 'button_13':
      //   values['dpadDown'] = event.value > 0.5;
      //   break;
      // case 'dpad_left':
      // case 'button_14':
      //   values['dpadLeft'] = event.value > 0.5;
      //   break;
      // case 'dpad_right':
      // case 'button_15':
      //   values['dpadRight'] = event.value > 0.5;
      //   break;
      // case 'left_x':
      // case 'axis_0':
      //   values['leftStickX'] = event.value;
      //   break;
      // case 'left_y':
      // case 'axis_1':
      //   values['leftStickY'] = event.value;
      //   break;
      // case 'right_x':
      // case 'axis_2':
      //   values['rightStickX'] = event.value;
      //   break;
      // case 'right_y':
      // case 'axis_3':
      //   values['rightStickY'] = event.value;
      //   break;
      // case 'left_trigger':
      // case 'axis_4':
      //   values['leftTrigger'] = event.value;
      //   break;
      // case 'right_trigger':
      // case 'axis_5':
      //   values['rightTrigger'] = event.value;
      //   break;
      default:
        print('Unhandled gamepad input: key=${event.key}, type=${event.type}, value=${event.value}');
    }
    
    controllerValues.value = values;
  }

  void _resetControllerValues() {
    controllerValues.value = {
      'leftStickX': 0.0,
      'leftStickY': 0.0,
      'rightStickX': 0.0,
      'rightStickY': 0.0,
      'leftTrigger': 0.0,
      'rightTrigger': 0.0,
      'buttonA': false,
      'buttonB': false,
      'buttonX': false,
      'buttonY': false,
      'dpadUp': false,
      'dpadDown': false,
      'dpadLeft': false,
      'dpadRight': false,
      'leftShoulder': false,
      'rightShoulder': false,
    };
  }

  void dispose() {
    _eventSubscription?.cancel();
    _activeGamepad = null;
    isGamepadConnected.value = false;
  }
} 