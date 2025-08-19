export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <title>HandyTech Solutions - Expert Handyman & Smart Home Services</title>
      <meta name="description" content="Your trusted handyman service with over a decade of experience. We specialize in plumbing, electrical work, smart home technology, painting, and general maintenance. Expert, detail-oriented work on every job." />
      
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">HandyTech Solutions</h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#services" className="text-gray-700 hover:text-gray-900">Services</a>
              <a href="#contact" className="text-gray-700 hover:text-gray-900">Contact</a>
              <a href="#" className="text-gray-700 hover:text-gray-900">Instagram</a>
              <a href="#" className="text-gray-700 hover:text-gray-900">Facebook</a>
              <a href="#" className="text-gray-700 hover:text-gray-900">Twitter</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Expert Handyman Services: Modern Solutions for Your Home
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Welcome to HandyTech Solutions, your trusted handyman service provider. Specializing in home improvement and smart tech solutions, we cater to every need with precision and professionalism. Rely on our skilled team for top-quality repairs and innovative upgrades.
          </p>
          <button className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700">
            Discover More
          </button>
        </div>
      </section>

      {/* About Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              HandyTech Solutions: Your Premier Home Improvement Partner
            </h3>
            <p className="text-lg text-gray-600 max-w-4xl mx-auto">
              HandyTech Solutions: Your trusted handyman service with over a decade of experience. We specialize in plumbing, electrical work, low voltage systems, smart technologies, painting, and general maintenance. Our commitment to superior customer service ensures expert, detail-oriented work on every job, big or small.
            </p>
          </div>
          <p className="text-center text-lg text-gray-600 max-w-3xl mx-auto">
            HandyTech Solutions: Your go-to for all your home improvement needs. Trust our skilled team for exceptional results in every project, from smart home installations to essential repairs.
          </p>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Our Expert HandyTech Services</h3>
            <p className="text-lg text-gray-600">Your trusted home improvement experts. Choose HandyTech Solutions.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h4 className="text-xl font-semibold text-gray-900 mb-3">Skilled Tech Handyman</h4>
              <p className="text-gray-600">Skilled pros for all your repairs and smart home improvements.</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h4 className="text-xl font-semibold text-gray-900 mb-3">Exceptional Customer Care</h4>
              <p className="text-gray-600">Customer satisfaction is our priority. Enjoy tailored service and a smooth experience.</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h4 className="text-xl font-semibold text-gray-900 mb-3">Dependable and Honest</h4>
              <p className="text-gray-600">Trust HandyTech Solutions for top-notch, reliable home improvements.</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h4 className="text-xl font-semibold text-gray-900 mb-3">Variety of Services</h4>
              <p className="text-gray-600">From minor fixes to extensive renovations, we've got you covered.</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h4 className="text-xl font-semibold text-gray-900 mb-3">Precision in Every Task</h4>
              <p className="text-gray-600">Detail-oriented. Meticulous. We take pride in striving for perfection.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            Contact Us for Reliable and Tech-Savvy Handyman Services
          </h3>
          <p className="text-lg text-gray-600 mb-8 max-w-4xl mx-auto">
            HandyTech Solutions: Your expert partner for home upgrades. With over a decade of experience, we specialize in carpentry, plumbing, painting, and smart home tech. From minor fixes to major renovations, we ensure quality and satisfaction. Turn your house into a smart home – reach out today.
          </p>
          <button className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700">
            Discover More
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-xl font-bold">HandyTech Solutions</h4>
            </div>
            <div className="flex space-x-6">
              <a href="#" className="text-gray-400 hover:text-white">Instagram</a>
              <a href="#" className="text-gray-400 hover:text-white">Facebook</a>
              <a href="#" className="text-gray-400 hover:text-white">Twitter</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
