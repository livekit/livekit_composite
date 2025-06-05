import yaml

build_folders_targets = [
    {"folder": "peer_demo", "targets": ["esp32", "esp32s3", "esp32s2"]},
    {"folder": "openai_demo", "targets": ["esp32s3"]},
    {"folder": "doorbell_demo", "targets": ["esp32s3", "esp32p4"]},
]

template = {
    "variables": {
        "DOCKER_IMAGE": "${CI_DOCKER_REGISTRY}/esp-env-v5.4:1",
        "BASE_FRAMEWORK_PATH": "$CI_PROJECT_DIR/esp-idf",
        "BASE_FRAMEWORK": "$IDF_REPOSITORY",
        "IDF_VERSION_TAG": "v5.4",
        "IDF_TAG_FLAG": False,
    },
    "stages": ["build"],
    ".build_template": {
        "before_script": [
            "export OPENAI_API_KEY=FAKE_KEY_FOR_BUILD_ONLY",
        ],
        "script": [
            "run_cmd python ${BASE_FRAMEWORK_PATH}/tools/ci/ci_build_apps.py ${CI_PROJECT_DIR}/solutions/$CI_BUILD_FOLDER -vv -t $IDF_TARGET --pytest-apps"
        ],
        "artifacts": {
            "paths": [
                "${CI_PROJECT_DIR}/solutions/$CI_BUILD_FOLDER/build*/size.json",
                "${CI_PROJECT_DIR}/solutions/$CI_BUILD_FOLDER/build*/build_log.txt",
                "${CI_PROJECT_DIR}/solutions/$CI_BUILD_FOLDER/build*/*.bin",
                "${CI_PROJECT_DIR}/solutions/$CI_BUILD_FOLDER/build*/*.elf",
                "${CI_PROJECT_DIR}/solutions/$CI_BUILD_FOLDER/build*/flasher_args.json",
                "${CI_PROJECT_DIR}/solutions/$CI_BUILD_FOLDER/build*/flash_project_args",
                "${CI_PROJECT_DIR}/solutions/$CI_BUILD_FOLDER/build*/config/sdkconfig.json",
                "${CI_PROJECT_DIR}/solutions/$CI_BUILD_FOLDER/build*/sdkconfig",
                "${CI_PROJECT_DIR}/solutions/$CI_BUILD_FOLDER/build*/bootloader/*.bin",
                "${CI_PROJECT_DIR}/solutions/$CI_BUILD_FOLDER/build*/partition_table/*.bin",
                "${CI_PROJECT_DIR}/solutions/$CI_BUILD_FOLDER/*.py",
            ],
            "expire_in": "4 days",
        },
    },
}

# Generate jobs
jobs = {}
for entry in build_folders_targets:
    folder = entry["folder"]
    for target in entry["targets"]:
        job_name = f"build_{folder}_{target}"
        jobs[job_name] = {
            "stage": "build",
            "extends": ".build_template",
            "variables": {
                "CI_BUILD_FOLDER": folder,
                "IDF_TARGET": target,
            },
        }

template.update(jobs)

# Save YAML to file
with open("generated_ci.yml", "w") as file:
    yaml.dump(template, file, default_flow_style=False)