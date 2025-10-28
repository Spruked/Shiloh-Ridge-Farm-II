import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-[#2d2d2d] text-white py-12 px-6" data-testid="footer">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-2xl font-bold mb-4" data-testid="footer-brand">Shiloh Ridge Farm</h3>
            <p className="text-gray-300 leading-relaxed">
              Family-owned farm specializing in premium Katahdin sheep, heritage livestock, and sustainable agriculture. Committed to integrity and honest farming practices.
            </p>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <div className="space-y-2">
              <Link to="/" className="block text-gray-300 hover:text-white transition-colors" data-testid="footer-link-home">
                Home
              </Link>
              <Link to="/livestock" className="block text-gray-300 hover:text-white transition-colors" data-testid="footer-link-livestock">
                Livestock
              </Link>
              <Link to="/about" className="block text-gray-300 hover:text-white transition-colors" data-testid="footer-link-about">
                About
              </Link>
              <Link to="/contact" className="block text-gray-300 hover:text-white transition-colors" data-testid="footer-link-contact">
                Contact
              </Link>
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact Information</h4>
            <div className="text-gray-300 leading-relaxed space-y-2">
              <div>
                <p className="font-medium text-white">Shiloh Ridge Farm</p>
                <p>Dominic Hanway</p>
                <p>20705 Quebec Road</p>
                <p>Maitland, Missouri 64466</p>
              </div>
              <div className="pt-2">
                <p><strong>Email:</strong> <a href="mailto:dominichanway@gmail.com" className="text-blue-300 hover:text-blue-200">dominichanway@gmail.com</a></p>
                <p><strong>Phone:</strong> <a href="tel:+1-660-254-6226" className="text-blue-300 hover:text-blue-200">(660) 254-6226</a></p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
          <p data-testid="footer-copyright">© {new Date().getFullYear()} Shiloh Ridge Farm. All rights reserved.</p>
          <p className="text-xs mt-2">&copy; {new Date().getFullYear()} Shiloh Ridge Farm. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;