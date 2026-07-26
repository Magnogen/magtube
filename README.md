# magtube
all the code for my youtube videos

### to make your own project

1.  create a new `<name>.js` file in `public/projects/`
2.  update `public/index.html` to use the project name on this line:
    ```html
    <!-- Insert project name here V -->
    <script src="projects/<name>.js"></script>
    ```
    you should see it near the top
3.  start the server
    ```bash
    bun run main.js
    ```
4.  open the link it logged to the console (should be `http://localhost:8080/`)

### to render

```bash
ffmpeg -framerate 30 -i ./renders/<name>/%012d.png -c:v libx264 -pix_fmt yuv420p ./renders/<name>.mp4
```