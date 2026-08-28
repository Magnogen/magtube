const [width, height] = [1920, 1080];
const vid = Video('widgettest', width, height, 30);

on('load', async () => {
  // const ctx = vid.canvas.getContext('2d');
  
  const bgcol = cyan;
  const bg = vid.Widget.Background(bgcol);
  
  const title = vid.Widget.Text('Hello, World!');
  title.style.size = width/16;
  title.style.color = bgcol.lightness(0.1).alpha(0);
  title.style.color.target = bgcol.lightness(0.1).alpha(1);
  title.x = width/2;
  title.y = height/2 + height/8;
  title.y.target = height/2 - height/16;
  title.y.springiness = 0.5;
  title.transform.squash.velocity = 1;
  title.transform.squash.springiness = 0.25;

  await vid.wait(0.5);

  const sub = vid.Widget.Text('This is a colourful widget test');
  sub.style.size = width/32;
  sub.style.color = bgcol.lightness(0.35).alpha(0);
  sub.style.color.target = bgcol.lightness(0.35);
  sub.x = width/2;
  sub.y = height/2 + height/8;
  sub.transform.squash = -0.75;
  sub.transform.squash.target = 0;
  sub.transform.squash.springiness = 0.25;

  await vid.wait(5);
});
