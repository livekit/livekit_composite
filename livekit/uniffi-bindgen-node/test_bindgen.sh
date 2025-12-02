#!/bin/bash
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/


# A script for exercising the node bindgen in local development. Use this to exercise it against
# arbitary dylibs for testing edge cases, working on new bindgen features, etc.
# Example usage: ./test_bindgen.sh path/to/libexample.dylib path/to/test-script.ts

DYLIB_PATH="$1"
TEST_SCRIPT="$2"
OUTPUT_DIR="output/"

if [[ -z "${DYLIB_PATH}" || -z "${TEST_SCRIPT}" ]]; then
  echo "Error: no dylib path or test script passed as parameters!"
  echo "Example usage: ./test_bindgen.sh path/to/libexample.dylib path/to/test-script.ts"
  exit 1
fi

# Guess the crate name from the passed dylib file name
# ie, path/to/libmycoolcrate.dylib -> mycoolcrate
DYLIB_FILE_NAME="$(basename "${DYLIB_PATH}")"
DYLIB_FILE_NAME_WITHOUT_EXTENSION="${DYLIB_FILE_NAME%.*}"
DYLIB_GUESSED_CRATE_NAME="${DYLIB_FILE_NAME_WITHOUT_EXTENSION#lib}"
CRATE_NAME="${DYLIB_GUESSED_CRATE_NAME}"

cargo run -- --crate-name "${CRATE_NAME}" -o "${OUTPUT_DIR}" "${DYLIB_PATH}"

# Copy passed dylib into the output directory
# Note that this assumes that the dylib used will run on the current system
dylib_path_extension="${DYLIB_PATH##*.}"
cp "${DYLIB_PATH}" "${OUTPUT_DIR}/lib${CRATE_NAME}.${dylib_path_extension}"

# Note: in the below script, get access to the bindgen exports like this:
# import { /* ... */ } from './mycoolcrate-node';
npx tsx "${TEST_SCRIPT}"
