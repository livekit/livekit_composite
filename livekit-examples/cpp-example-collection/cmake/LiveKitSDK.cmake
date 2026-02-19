# LiveKitSDK.cmake
#
# Helper for example repos:
# - Downloads the appropriate prebuilt LiveKit C++ SDK release asset for the host OS/arch
# - Extracts it into a local directory (default: <build>/_deps/livekit-sdk)
# - Prepends the extracted prefix to CMAKE_PREFIX_PATH so:
#     find_package(LiveKit CONFIG REQUIRED)
#   works out of the box.
#
# Usage:
#   list(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/cmake")
#   include(LiveKitSDK)
#   livekit_sdk_setup(VERSION "latest" SDK_DIR "${CMAKE_BINARY_DIR}/_deps/livekit-sdk")
#
# Optional:
#   livekit_sdk_setup(VERSION "latest" REPO "livekit/client-sdk-cpp" GITHUB_TOKEN "$ENV{GITHUB_TOKEN}")

include_guard(GLOBAL)

# -------------------- Host detection --------------------
function(_lk_detect_host out_os out_arch)
  if(WIN32)
    set(_os "windows")
  elseif(APPLE)
    set(_os "macos")
  elseif(UNIX)
    set(_os "linux")
  else()
    message(FATAL_ERROR "LiveKitSDK: unsupported host OS")
  endif()

  # Use host processor; normalize common variants (case-insensitive)
  set(_proc "${CMAKE_HOST_SYSTEM_PROCESSOR}")
  string(TOLOWER "${_proc}" _proc_l)

  if(_proc_l MATCHES "^(x86_64|amd64)$")
    set(_arch "x64")
  elseif(_proc_l MATCHES "^(arm64|aarch64)$")
    set(_arch "arm64")
  else()
    message(FATAL_ERROR "LiveKitSDK: unsupported host arch: ${_proc}")
  endif()

  set(${out_os}   "${_os}"   PARENT_SCOPE)
  set(${out_arch} "${_arch}" PARENT_SCOPE)
endfunction()

function(_lk_default_triple out_triple)
  _lk_detect_host(_os _arch)
  set(${out_triple} "${_os}-${_arch}" PARENT_SCOPE)
endfunction()

function(_lk_archive_ext out_ext)
  _lk_detect_host(_os _arch)
  if(_os STREQUAL "windows")
    set(${out_ext} "zip" PARENT_SCOPE)
  else()
    set(${out_ext} "tar.gz" PARENT_SCOPE)
  endif()
endfunction()

# -------------------- GitHub API helpers --------------------
# Resolve VERSION="latest" via GitHub API, returning version without leading "v".
function(_lk_resolve_latest_version out_version repo download_dir github_token)
  if(NOT download_dir)
    set(download_dir "${CMAKE_BINARY_DIR}/_downloads")
  endif()
  file(MAKE_DIRECTORY "${download_dir}")

  set(_api "https://api.github.com/repos/${repo}/releases/latest")

  # Sanitize repo for filename
  string(REPLACE "/" "_" _repo_sanitized "${repo}")
  set(_json "${download_dir}/livekit_latest_release_${_repo_sanitized}.json")

  # Build headers as a proper LIST (each element is one full header line)
  set(_headers
    "User-Agent: cmake-livekit-sdk/1.0"
    "Accept: application/vnd.github+json"
    "X-GitHub-Api-Version: 2022-11-28"
  )

  # Strip token (defensive: avoids accidental newline causing header splitting)
  if(NOT "${github_token}" STREQUAL "")
    string(STRIP "${github_token}" github_token)
  endif()

  # Use Authorization only if token is non-empty
  if(NOT "${github_token}" STREQUAL "")
    # "token" is broadly compatible
    list(APPEND _headers "Authorization: Bearer ${github_token}")
  else()
    message(STATUS "LiveKitSDK: no GITHUB_TOKEN provided; GitHub API may rate-limit.")
  endif()

  # Capture LOG for actionable failure output
  set(_dl_args
    TLS_VERIFY ON
    STATUS _st
    LOG _log
  )
  foreach(_h IN LISTS _headers)
    list(APPEND _dl_args HTTPHEADER "${_h}")
  endforeach()
  file(DOWNLOAD "${_api}" "${_json}" ${_dl_args})

  list(GET _st 0 _code)
  list(GET _st 1 _msg)
  if(NOT _code EQUAL 0)
    message(STATUS "LiveKitSDK: GitHub API download log:\n${_log}")
    if(EXISTS "${_json}")
      file(READ "${_json}" _body)
      message(STATUS "LiveKitSDK: GitHub API response body:\n${_body}")
    endif()
    message(FATAL_ERROR
      "LiveKitSDK: failed to query latest release from GitHub API\n"
      "API: ${_api}\n"
      "Status: ${_code}\n"
      "Message: ${_msg}\n"
      "Tip: set GITHUB_TOKEN to avoid rate limits, or use VERSION=<fixed>."
    )
  endif()

  file(READ "${_json}" _content)

  # CMake >= 3.19 supports string(JSON ...)
  string(JSON _tag GET "${_content}" tag_name)
  if(_tag STREQUAL "")
    message(FATAL_ERROR "LiveKitSDK: GitHub API response missing tag_name")
  endif()

  # Strip leading "v" if present
  string(REGEX REPLACE "^v" "" _ver "${_tag}")
  set(${out_version} "${_ver}" PARENT_SCOPE)
endfunction()

# -------------------- Public entrypoint --------------------
# livekit_sdk_setup(
#   VERSION <ver|latest>
#   SDK_DIR <dir>
#   [REPO <org/repo>]                 default: livekit/client-sdk-cpp
#   [SHA256 <hash>]                   optional: verify download (only works for fixed VERSION)
#   [TRIPLE <os-arch>]                optional override
#   [DOWNLOAD_DIR <dir>]              default: <build>/_downloads
#   [GITHUB_TOKEN <token>]            optional: auth for GitHub API when VERSION=latest
#   [NO_DOWNLOAD]                     error if not already present
# )
function(livekit_sdk_setup)
  set(options NO_DOWNLOAD)
  set(oneValueArgs VERSION SDK_DIR REPO SHA256 TRIPLE DOWNLOAD_DIR GITHUB_TOKEN)
  cmake_parse_arguments(LK "${options}" "${oneValueArgs}" "" ${ARGN})

  if(NOT LK_VERSION)
    message(FATAL_ERROR "livekit_sdk_setup: VERSION is required (use \"latest\" if desired)")
  endif()
  if(NOT LK_SDK_DIR)
    message(FATAL_ERROR "livekit_sdk_setup: SDK_DIR is required")
  endif()

  if(NOT LK_REPO)
    set(LK_REPO "livekit/client-sdk-cpp")
  endif()
  if(NOT LK_DOWNLOAD_DIR)
    set(LK_DOWNLOAD_DIR "${CMAKE_BINARY_DIR}/_downloads")
  endif()
  if(NOT LK_TRIPLE)
    _lk_default_triple(LK_TRIPLE)
  endif()

  # Resolve latest tag if requested
  set(_resolved_version "${LK_VERSION}")
  if(LK_VERSION STREQUAL "latest")
    if(LK_SHA256)
      message(WARNING "LiveKitSDK: SHA256 was provided but VERSION=latest; ignoring SHA256.")
      set(LK_SHA256 "")
    endif()

    if(NOT LK_GITHUB_TOKEN)
      # Common in CI if you set env: GITHUB_TOKEN: ${{ github.token }}
      set(LK_GITHUB_TOKEN "$ENV{GITHUB_TOKEN}")
    endif()

    _lk_resolve_latest_version(_resolved_version "${LK_REPO}" "${LK_DOWNLOAD_DIR}" "${LK_GITHUB_TOKEN}")
    message(STATUS "LiveKitSDK: resolved latest version = ${_resolved_version}")
  endif()

  _lk_archive_ext(_ext)
  set(_archive "livekit-sdk-${LK_TRIPLE}-${_resolved_version}.${_ext}")
  set(_url "https://github.com/${LK_REPO}/releases/download/v${_resolved_version}/${_archive}")

  set(_archive_path "${LK_DOWNLOAD_DIR}/${_archive}")

  # The archive is expected to contain a top-level folder named:
  #   livekit-sdk-<triple>-<version>/
  set(_extracted_root "${LK_SDK_DIR}/livekit-sdk-${LK_TRIPLE}-${_resolved_version}")

  file(MAKE_DIRECTORY "${LK_DOWNLOAD_DIR}")
  file(MAKE_DIRECTORY "${LK_SDK_DIR}")

  if(NOT EXISTS "${_extracted_root}")
    if(LK_NO_DOWNLOAD)
      message(FATAL_ERROR
        "LiveKitSDK: SDK not found at:\n  ${_extracted_root}\n"
        "and NO_DOWNLOAD was set."
      )
    endif()

    message(STATUS "LiveKitSDK: downloading ${_url}")

    if(LK_SHA256)
      file(DOWNLOAD "${_url}" "${_archive_path}"
        SHOW_PROGRESS
        TLS_VERIFY ON
        EXPECTED_HASH "SHA256=${LK_SHA256}"
        STATUS _st
        LOG _log
      )
    else()
      file(DOWNLOAD "${_url}" "${_archive_path}"
        SHOW_PROGRESS
        TLS_VERIFY ON
        STATUS _st
        LOG _log
      )
    endif()

    list(GET _st 0 _code)
    list(GET _st 1 _msg)
    if(NOT _code EQUAL 0)
      message(STATUS "LiveKitSDK: download log:\n${_log}")
      message(FATAL_ERROR "LiveKitSDK: download failed\nURL: ${_url}\nStatus: ${_code}\nMessage: ${_msg}")
    endif()

    # Remove any previous partial extraction
    file(REMOVE_RECURSE "${_extracted_root}")

    message(STATUS "LiveKitSDK: extracting ${_archive_path}")
    file(ARCHIVE_EXTRACT
      INPUT "${_archive_path}"
      DESTINATION "${LK_SDK_DIR}"
    )
  endif()

  if(NOT EXISTS "${_extracted_root}/lib/cmake")
    message(FATAL_ERROR
      "LiveKitSDK: extracted SDK does not look valid (missing lib/cmake)\n"
      "Expected: ${_extracted_root}\n"
      "If your archive root folder name differs, adjust _extracted_root logic."
    )
  endif()

  # Make find_package(LiveKit CONFIG REQUIRED) work.
  list(PREPEND CMAKE_PREFIX_PATH "${_extracted_root}")
  set(CMAKE_PREFIX_PATH "${CMAKE_PREFIX_PATH}" PARENT_SCOPE)

  # Direct hint to the package config dir
  set(LiveKit_DIR "${_extracted_root}/lib/cmake/LiveKit" PARENT_SCOPE)

  # Export a few useful variables for callers (optional).
  set(LIVEKIT_SDK_EXTRACTED_ROOT "${_extracted_root}" CACHE PATH "LiveKit SDK extracted root" FORCE)
  set(LIVEKIT_SDK_URL_USED "${_url}" CACHE STRING "LiveKit SDK URL used" FORCE)
  set(LIVEKIT_SDK_VERSION_RESOLVED "${_resolved_version}" CACHE STRING "LiveKit SDK resolved version" FORCE)
  set(LIVEKIT_SDK_TRIPLE_USED "${LK_TRIPLE}" CACHE STRING "LiveKit SDK triple used" FORCE)

  message(STATUS "LiveKitSDK: using SDK at ${_extracted_root}")
endfunction()
