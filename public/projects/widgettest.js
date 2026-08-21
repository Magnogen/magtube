const [width, height] = [1920, 1080];
const vid = Video('widgettest', width, height, 30);

on('load', async () => {
  const ctx = vid.canvas.getContext('2d');
  
  const bg = vid.Widget.Background(gray(0.9));
  
  const title = vid.Widget.Text('Hello, World!');
  title.style.size = width/16;
  title.style.color = gray(0.1).alpha(0);
  title.style.color.target = gray(0.1);
  title.x = width/2;
  title.y = height/2 + height/8;
  title.y.target = height/2;
  title.y.springiness = 0.5;

  await vid.wait(5);

  const sub = vid.Widget.Text('This is a widget test');
  sub.style.size = width/32;
  sub.style.color = gray(0.5);
  sub.x = width/2;
  sub.y = height/2 + height/8;
  sub.progress = 0;
  sub.progress.target = 1.1;
  sub.progress.frequency = 0.3;

  await vid.wait(5);
});