<a href="https://livekit.io/">
  <img src="./.github/assets/livekit-mark.png" alt="LiveKit logo" width="100" height="100">
</a>

# LiveKit Templates Index

<p>
  <a href="https://cloud.livekit.io/projects/p_/sandbox"><strong>Deploy a sandbox app</strong></a>
  •
  <a href="https://docs.livekit.io">LiveKit Docs</a>
  •
  <a href="https://livekit.io/cloud">LiveKit Cloud</a>
  •
  <a href="https://blog.livekit.io/">Blog</a>
</p>

This repository contains a collection of templates for the LiveKit platform. Each template is designed to be used as a starting point for building an application on LiveKit, as well as to work with the [LiveKit Sandbox](https://docs.livekit.io/cloud/home/sandbox) feature to rapidly develop and share app prototypes. 

## Using a template

All templates in this index can be bootstrapped using the [LiveKit CLI](https://docs.livekit.io/cloud/home/cli). Running the following command will allow you to choose and initialize a template:

```bash
lk app create
```

After choosing a template and name for your project, the CLI will execute the following steps:

1. Clone the git repository associated with the template to your `/tmp` directory or equivalent
2. De-git the repository so you don't include the template's history in your project
3. Copy the `.env.example` file to `.env.local`. This step includes the following:
    - Automatically updating any `LIVEKIT_*` environment variables that are recognized.
    - Prompting you for any additional variables that are not recognized, such as required API keys.
4. Move the directory from `/tmp` to the location you specified
5. Run the `post_create` task from the `taskfile.yaml` and print any user setup instructions

At this point, you're ready to start developing your application. Some templates work best with others – for example, an AI agent template may pair well with a voice assistant frontend template. It all depends on what you want to build. The beauty of LiveKit is that the primitives are interchangeable!

If you need a refresher on the basics, be sure to head to our documentation and read the [Intro to LiveKit](http://docs.livekit.io/home/get-started/intro-to-livekit/).

## Creating your own template

### Repository structure

Your template may be any kind of component, from a front-end for a livestreaming app to a helpful AI assistant built with the Agents framework. In order to be accepted as a community template, your repository must adhere to certain contraints:

- The template must be a public git repository, though it does not have to be hosted on GitHub.
- The repository must include a `.env.example` file at the root, containing stubs for the environment variables that the template requires. The following varaibles are standard, and can be inferred during bootstrap with the LiveKit CLI:
    - `LIVEKIT_URL`
    - `LIVEKIT_API_KEY`
    - `LIVEKIT_API_SECRET`
- The repository must include a `taskfile.yaml` file in the root that follows the [Taskfile](https://taskfile.dev/reference/schema) format and defines at least the following tasks:
    - `post_create`: This task is run after the repository is bootstrapped using `lk app create`, and usually prints setup instructions for the user.
    - `install`: This task can be run to install dependencies or perform other steup for the template.

### Publishing your template

When you're ready to share your template with the world, you can submit a pull request to this repository. The pull request should add a new entry to the `templates.yaml` file with the following schema:

<table>
    <tr>
        <th>Field</th>
        <th>Type</th>
        <th>Required</th>
        <th>Description</th>
    </tr>
    <tr>
        <td>name</td>
        <td><code>string</code></td>
        <td><code>true</code></td>
        <td>The kebab-case identifier of the template.</td>
    </tr>
    <tr>
        <td>display_name</td>
        <td><code>string</code></td>
        <td><code>true</code></td>
        <td>The human-readable name of the template.</td>
    </tr>
    <tr>
        <td>desc</td>
        <td><code>string</code></td>
        <td><code>true</code></td>
        <td>A brief description of the template.</td>
    </tr>
    <tr>
        <td>url</td>
        <td><code>string</code></td>
        <td><code>true</code></td>
        <td>The URL of the git repository containing the template.</td>
    </tr>
    <tr>
        <td>image</td>
        <td><code>string</code></td>
        <td><code>false</code></td>
        <td>The URL of an image to display for the template.</td>
    </tr>
    <tr>
        <td>docs</td>
        <td><code>string</code></td>
        <td><code>false</code></td>
        <td>The URL of the documentation for the template.</td>
    </tr>
    <tr>
        <td>requires</td>
        <td><code>Seq&lt;string&gt;</code></td>
        <td><code>false</code></td>
        <td>A list of other templates that this template may require to function properly. For example, AI agents are somewhat useless without a front-end to connect to.</td>
    </tr>
    <tr>
        <td>attrs</td>
        <td><code>Map&lt;string, string&gt;</code></td>
        <td><code>false</code></td>
        <td>A map of additional attributes that may be useful for describing the template. Common keys are <code>Type</code>, <code>Tools</code>, <code>License</code>, etc.</td>
    </tr>
    <tr>
        <td>created_at</td>
        <td><code>string</code></td>
        <td><code>false</code></td>
        <td>The date the template was added to the index, in <a href="https://en.wikipedia.org/wiki/ISO_8601">ISO 8601</a> datetime format.</td>
    </tr>
    <tr>
        <td>updated_at</td>
        <td><code>string</code></td>
        <td><code>false</code></td>
        <td>The date the template was last updated, in <a href="https://en.wikipedia.org/wiki/ISO_8601">ISO 8601</a> datetime format.</td>
    </tr>
    <tr>
        <td>is_enabled</td>
        <td><code>boolean</code></td>
        <td><code>true</code></td>
        <td>Whether the template is enabled for use with the LiveKit CLI. When submitting a template, this should be <code>false</code> until reviewed by a LiveKit representative.</td>
    </tr>
    <tr>
        <td>is_sandbox</td>
        <td><code>boolean</code></td>
        <td><code>false</code></td>
        <td>Whether the template is a sandbox template. Sandbox templates are designed to be hosted by us directly, and have special considerations. When submitting a template, this should be <code>false</code>. If you're interested in submitting a sandbox template, get in contact with us via <a href="https://join.slack.com/t/livekit-users/shared_invite/zt-28a400kyd-I0mPVUrxcZ5TEayIvmq9mw">Slack</a>, or via GitHub issues here.</td>
    </tr>
    <tr>
        <td>is_hidden</td>
        <td><code>boolean</code></td>
        <td><code>false</code></td>
        <td>Whether the template is hidden from the LiveKit CLI. This is useful for templates that are still in development, or are deprecated but still accessible.</td>
    </tr>
</table>
