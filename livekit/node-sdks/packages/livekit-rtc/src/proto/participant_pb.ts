// Copyright 2023 LiveKit, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// @generated by protoc-gen-es v1.10.0 with parameter "target=ts,import_extension=.js"
// @generated from file participant.proto (package livekit.proto, syntax proto2)
/* eslint-disable */
// @ts-nocheck

import type { BinaryReadOptions, FieldList, JsonReadOptions, JsonValue, PartialMessage, PlainMessage } from "@bufbuild/protobuf";
import { Message, proto2 } from "@bufbuild/protobuf";
import { FfiOwnedHandle } from "./handle_pb.js";

/**
 * @generated from enum livekit.proto.ParticipantKind
 */
export enum ParticipantKind {
  /**
   * @generated from enum value: PARTICIPANT_KIND_STANDARD = 0;
   */
  STANDARD = 0,

  /**
   * @generated from enum value: PARTICIPANT_KIND_INGRESS = 1;
   */
  INGRESS = 1,

  /**
   * @generated from enum value: PARTICIPANT_KIND_EGRESS = 2;
   */
  EGRESS = 2,

  /**
   * @generated from enum value: PARTICIPANT_KIND_SIP = 3;
   */
  SIP = 3,

  /**
   * @generated from enum value: PARTICIPANT_KIND_AGENT = 4;
   */
  AGENT = 4,
}
// Retrieve enum metadata with: proto2.getEnumType(ParticipantKind)
proto2.util.setEnumType(ParticipantKind, "livekit.proto.ParticipantKind", [
  { no: 0, name: "PARTICIPANT_KIND_STANDARD" },
  { no: 1, name: "PARTICIPANT_KIND_INGRESS" },
  { no: 2, name: "PARTICIPANT_KIND_EGRESS" },
  { no: 3, name: "PARTICIPANT_KIND_SIP" },
  { no: 4, name: "PARTICIPANT_KIND_AGENT" },
]);

/**
 * @generated from enum livekit.proto.DisconnectReason
 */
export enum DisconnectReason {
  /**
   * @generated from enum value: UNKNOWN_REASON = 0;
   */
  UNKNOWN_REASON = 0,

  /**
   * the client initiated the disconnect
   *
   * @generated from enum value: CLIENT_INITIATED = 1;
   */
  CLIENT_INITIATED = 1,

  /**
   * another participant with the same identity has joined the room
   *
   * @generated from enum value: DUPLICATE_IDENTITY = 2;
   */
  DUPLICATE_IDENTITY = 2,

  /**
   * the server instance is shutting down
   *
   * @generated from enum value: SERVER_SHUTDOWN = 3;
   */
  SERVER_SHUTDOWN = 3,

  /**
   * RoomService.RemoveParticipant was called
   *
   * @generated from enum value: PARTICIPANT_REMOVED = 4;
   */
  PARTICIPANT_REMOVED = 4,

  /**
   * RoomService.DeleteRoom was called
   *
   * @generated from enum value: ROOM_DELETED = 5;
   */
  ROOM_DELETED = 5,

  /**
   * the client is attempting to resume a session, but server is not aware of it
   *
   * @generated from enum value: STATE_MISMATCH = 6;
   */
  STATE_MISMATCH = 6,

  /**
   * client was unable to connect fully
   *
   * @generated from enum value: JOIN_FAILURE = 7;
   */
  JOIN_FAILURE = 7,

  /**
   * Cloud-only, the server requested Participant to migrate the connection elsewhere
   *
   * @generated from enum value: MIGRATION = 8;
   */
  MIGRATION = 8,

  /**
   * the signal websocket was closed unexpectedly
   *
   * @generated from enum value: SIGNAL_CLOSE = 9;
   */
  SIGNAL_CLOSE = 9,

  /**
   * the room was closed, due to all Standard and Ingress participants having left
   *
   * @generated from enum value: ROOM_CLOSED = 10;
   */
  ROOM_CLOSED = 10,

  /**
   * SIP callee did not respond in time
   *
   * @generated from enum value: USER_UNAVAILABLE = 11;
   */
  USER_UNAVAILABLE = 11,

  /**
   * SIP callee rejected the call (busy)
   *
   * @generated from enum value: USER_REJECTED = 12;
   */
  USER_REJECTED = 12,

  /**
   * SIP protocol failure or unexpected response
   *
   * @generated from enum value: SIP_TRUNK_FAILURE = 13;
   */
  SIP_TRUNK_FAILURE = 13,

  /**
   * @generated from enum value: CONNECTION_TIMEOUT = 14;
   */
  CONNECTION_TIMEOUT = 14,

  /**
   * @generated from enum value: MEDIA_FAILURE = 15;
   */
  MEDIA_FAILURE = 15,
}
// Retrieve enum metadata with: proto2.getEnumType(DisconnectReason)
proto2.util.setEnumType(DisconnectReason, "livekit.proto.DisconnectReason", [
  { no: 0, name: "UNKNOWN_REASON" },
  { no: 1, name: "CLIENT_INITIATED" },
  { no: 2, name: "DUPLICATE_IDENTITY" },
  { no: 3, name: "SERVER_SHUTDOWN" },
  { no: 4, name: "PARTICIPANT_REMOVED" },
  { no: 5, name: "ROOM_DELETED" },
  { no: 6, name: "STATE_MISMATCH" },
  { no: 7, name: "JOIN_FAILURE" },
  { no: 8, name: "MIGRATION" },
  { no: 9, name: "SIGNAL_CLOSE" },
  { no: 10, name: "ROOM_CLOSED" },
  { no: 11, name: "USER_UNAVAILABLE" },
  { no: 12, name: "USER_REJECTED" },
  { no: 13, name: "SIP_TRUNK_FAILURE" },
  { no: 14, name: "CONNECTION_TIMEOUT" },
  { no: 15, name: "MEDIA_FAILURE" },
]);

/**
 * @generated from message livekit.proto.ParticipantInfo
 */
export class ParticipantInfo extends Message<ParticipantInfo> {
  /**
   * @generated from field: required string sid = 1;
   */
  sid?: string;

  /**
   * @generated from field: required string name = 2;
   */
  name?: string;

  /**
   * @generated from field: required string identity = 3;
   */
  identity?: string;

  /**
   * @generated from field: required string metadata = 4;
   */
  metadata?: string;

  /**
   * @generated from field: map<string, string> attributes = 5;
   */
  attributes: { [key: string]: string } = {};

  /**
   * @generated from field: required livekit.proto.ParticipantKind kind = 6;
   */
  kind?: ParticipantKind;

  /**
   * @generated from field: required livekit.proto.DisconnectReason disconnect_reason = 7;
   */
  disconnectReason?: DisconnectReason;

  constructor(data?: PartialMessage<ParticipantInfo>) {
    super();
    proto2.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto2 = proto2;
  static readonly typeName = "livekit.proto.ParticipantInfo";
  static readonly fields: FieldList = proto2.util.newFieldList(() => [
    { no: 1, name: "sid", kind: "scalar", T: 9 /* ScalarType.STRING */, req: true },
    { no: 2, name: "name", kind: "scalar", T: 9 /* ScalarType.STRING */, req: true },
    { no: 3, name: "identity", kind: "scalar", T: 9 /* ScalarType.STRING */, req: true },
    { no: 4, name: "metadata", kind: "scalar", T: 9 /* ScalarType.STRING */, req: true },
    { no: 5, name: "attributes", kind: "map", K: 9 /* ScalarType.STRING */, V: {kind: "scalar", T: 9 /* ScalarType.STRING */} },
    { no: 6, name: "kind", kind: "enum", T: proto2.getEnumType(ParticipantKind), req: true },
    { no: 7, name: "disconnect_reason", kind: "enum", T: proto2.getEnumType(DisconnectReason), req: true },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): ParticipantInfo {
    return new ParticipantInfo().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): ParticipantInfo {
    return new ParticipantInfo().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): ParticipantInfo {
    return new ParticipantInfo().fromJsonString(jsonString, options);
  }

  static equals(a: ParticipantInfo | PlainMessage<ParticipantInfo> | undefined, b: ParticipantInfo | PlainMessage<ParticipantInfo> | undefined): boolean {
    return proto2.util.equals(ParticipantInfo, a, b);
  }
}

/**
 * @generated from message livekit.proto.OwnedParticipant
 */
export class OwnedParticipant extends Message<OwnedParticipant> {
  /**
   * @generated from field: required livekit.proto.FfiOwnedHandle handle = 1;
   */
  handle?: FfiOwnedHandle;

  /**
   * @generated from field: required livekit.proto.ParticipantInfo info = 2;
   */
  info?: ParticipantInfo;

  constructor(data?: PartialMessage<OwnedParticipant>) {
    super();
    proto2.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto2 = proto2;
  static readonly typeName = "livekit.proto.OwnedParticipant";
  static readonly fields: FieldList = proto2.util.newFieldList(() => [
    { no: 1, name: "handle", kind: "message", T: FfiOwnedHandle, req: true },
    { no: 2, name: "info", kind: "message", T: ParticipantInfo, req: true },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): OwnedParticipant {
    return new OwnedParticipant().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): OwnedParticipant {
    return new OwnedParticipant().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): OwnedParticipant {
    return new OwnedParticipant().fromJsonString(jsonString, options);
  }

  static equals(a: OwnedParticipant | PlainMessage<OwnedParticipant> | undefined, b: OwnedParticipant | PlainMessage<OwnedParticipant> | undefined): boolean {
    return proto2.util.equals(OwnedParticipant, a, b);
  }
}

