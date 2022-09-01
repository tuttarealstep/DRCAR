class Vec2
{
    constructor(x = 0, y = 0)
    {
        this.x = x;
        this.y = y;
    }
    
    length()
    {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
}