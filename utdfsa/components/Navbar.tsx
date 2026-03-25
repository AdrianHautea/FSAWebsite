export default function Navbar(){
    return(
        <nav className="flex justify-between items-center p-4">
            <a href="/"> *Insert Logo Here* </a>
            <ul className="flex gap-4">
                <li><a href="/Membership"> Membership </a></li>
                <li><a href="/Pamilya"> Pamilya </a></li>
                <li><a href="/Events"> Events </a></li>
                <li><a href="/Socials"> Socials </a></li>
                <li><a href="/About"> About </a></li>
            </ul>
        </nav>
    );
}