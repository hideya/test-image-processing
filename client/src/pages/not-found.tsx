import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center bg-neutral-100 px-4">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-xl mb-6">Page not found</p>
      <p className="text-stone-600 mb-8">The page you are looking for doesn't exist or has been moved.</p>
      <Link href="/">
        <a className="px-4 py-2 bg-primary text-white font-medium rounded-md hover:bg-primary-dark transition duration-200">
          Go back home
        </a>
      </Link>
    </div>
  );
}