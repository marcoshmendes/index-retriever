## Disclaimer

Index Retriever is intended for legal and ethical use only. It is not designed, nor should it be used, to access or retrieve private or sensitive information without proper authorization. The purpose of this project is to serve as a helpful tool for server administrators, assisting them in managing and check publicly available data on servers configured to allow **Directory Listing**. Users are responsible for ensuring that their use of Index Retriever complies with all applicable laws and regulations, and the project contributors disclaim any liability for misuse of the tool.

# Index Retriever

Index Retriever is an open-source application designed to retrieve data from servers configured to allow Directory Listing. This project is a command line tool, developed in Node.js, enables users to download index files/directories.

### Example (this page doesn't exist):

![image](https://github.com/marcoshmendes/index-retriever/assets/17493368/31401023-1cf0-4a4c-bdb4-bbe7d9908861)

![Captura de tela 2023-12-03 131918](https://github.com/marcoshmendes/index-retriever/assets/17493368/689d31b4-45a2-4c99-b0c5-8791747539a9)


## Requirements

- [Node.js](https://nodejs.org/) 20.18.1 or newer

## Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/marcoshmendes/index-retriever.git
   
2. Navigate to the project directory:
    
    ```bash
    cd index-retriever
    
3. Install dependencies:

    ```bash
    npm install
    
## Usage

```bash
node index https://example.com/files/
```

or run `npm start` (or `node index`) without arguments and type the URL when prompted.

Files are saved to a new `<host>-<timestamp>` folder in the current directory, mirroring the remote structure:

- Subdirectories are downloaded recursively (up to 10 levels deep); only links below the listed directory are followed, so parent, sort and external links are ignored.
- Files are saved byte for byte as served (no transparent decompression).
- A failed file does not stop the run; failures are listed at the end and the process exits with code 1.

## Contribution

Feel free to contribute improvements, bug fixes, or new features. Open an issue for larger discussions or submit a pull request with your changes.

## License

This project is distributed under the MIT License.
