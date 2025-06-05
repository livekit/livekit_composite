from setuptools import setup, find_packages

setup(
    name="agent_extensions",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "livekit",
        "python-dotenv",
        "simpleaudio",  # for wav_player
    ],
    author="Your Name",
    author_email="your.email@example.com",
    description="Extensions and utilities for LiveKit agents",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    url="https://github.com/yourusername/agent_extensions",
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.7",
) 