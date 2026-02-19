# Backup Egress Recordings

## Overview

If there is an error writing to a [cloud storage provider](https://docs. livekit. io/home/egress/outputs/#cloud-storage-configurations), you will lose the recording. To assist with this, LiveKit provides an egress backup recording option to ensure that you can recover when this happens.

When this feature is enabled and a [cloud storage upload](https://docs. livekit. io/home/egress/outputs/#cloud-storage-configurations) fails, LiveKit will automatically save the recording to our backup storage bucket for 7 days. The location of the file is included in the `EgressEnded`[webhook event](https://docs. livekit. io/home/server/webhooks/#egress-ended).


### Costs

There are no additional charges at this time (as of Jan-2026). This may change in the future.


## Retrieving backup for failed egress upload

When an egress upload to a cloud storage provider fails and **temporary egress backup** is enabled for your LiveKit Cloud project, the recording will be stored to a backup storage bucket for retrieval.

In order to capture these occurrences, inspect the payload of the `egress_ended`[webhook event](https://docs. livekit. io/home/server/webhooks/#egress-ended) with a `status` of `EGRESS_COMPLETE` and `backupStorageUsed` set to `true`.


#### Example payload ofegress_endedevent with backup storage used

When you receive an `egress_ended` webhook event with the `backupStorageUsed` indicator as shown in the example payload above, you can retrieve the backup of the recording using the `manifestLocation` that is provided with the event.

Fetch the URL provided in the `manifestLocation` property and you will receive a JSON document that represents a manifest which outlines the set of recordings that have been backed up for this particular session. The `files` property in the manifest contains an array of the backed up recordings and you can download each backup recording through the URL provided in the `location` property.


> **Note:** URLs for backup recordings are valid for 7 days after the upload failure occurred.


#### Example egress backup manifest


#### Backup Recording Details in Dashboard

In addition to the `egress_ended` webhook event, the backup recording is also included in the view of the egress session in the LiveKit Cloud dashboard. You can retrieve the backup recording using the URL shown in the Destinations section.


## How to Enable

This must be enabled by a LiveKit engineer at this time. They will need enable this on each project where you would like this feature.