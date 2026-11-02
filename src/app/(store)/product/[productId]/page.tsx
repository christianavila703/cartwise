import { ThumbsDown, ThumbsUp } from "lucide-react";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import Gallery from "@/domains/product/components/gallery";
import ProductBoard from "@/domains/product/components/productBoard";
import ProductCard from "@/domains/product/components/productCard";
import ProductSpecs from "@/domains/product/components/productSpecs";
import { TopProducts } from "@/domains/product/constants";
import { IMAGE_BASE_URL } from "@/shared/constants/store";
import { getProductPage } from "@/shared/lib/storeData";

type TProps = { params: Promise<{ productId: string }> };

// stock and prices change, so product pages are rendered per request
export const dynamic = "force-dynamic";

export const generateMetadata = async ({ params }: TProps): Promise<Metadata> => {
  const product = await getProductPage((await params).productId);
  if (!product) return { title: "Product not found — Cartwise" };

  const price = product.salePrice ?? product.price;
  const description =
    product.desc ||
    `${product.name} for €${price.toFixed(2)} at Cartwise. ${product.specialFeatures.filter(Boolean).join(", ")}.`;
  const image = product.images[0] ? IMAGE_BASE_URL + product.images[0] : undefined;

  return {
    title: `${product.name} — Cartwise`,
    description,
    openGraph: {
      title: product.name,
      description,
      type: "website",
      images: image && image.startsWith("http") ? [{ url: image, alt: product.name }] : undefined,
    },
  };
};

const ProductPage = async ({ params }: TProps) => {
  const { productId } = await params;
  const productInfo = await getProductPage(productId);
  if (!productInfo) notFound();

  return (
    <div className="storeContainer">
      <div className="w-full h-auto mt-[160px] flex flex-col">
        <div className="w-full flex flex-col lg:flex-row gap-12">
          <div className="flex-grow">
            <nav aria-label="Breadcrumb" className="block text-gray-700 w-full mb-10 text-sm">
              <Link href={"/"} className="hover:font-medium after:mx-1 after:content-['/'] hover:text-gray-800">
                Home
              </Link>
              {productInfo.path.map((item, index) => (
                <Link
                  key={item.url + index}
                  href={"/list/" + productInfo.path.slice(0, index + 1).map((pathItem) => pathItem.url).join("/")}
                  className="after:content-['/'] last:after:content-[''] after:mx-1 hover:text-gray-800"
                >
                  {item.name}
                </Link>
              ))}
            </nav>
            <Gallery images={productInfo.images} />
          </div>
          <div className="lg:w-[512px] w-full">
            <ProductBoard
              key={productInfo.id}
              boardData={{
                id: productInfo.id,
                isAvailable: productInfo.isAvailable,
                stock: productInfo.stock,
                defaultQuantity: 1,
                name: productInfo.name,
                price: productInfo.price,
                dealPrice: productInfo.salePrice || undefined,
                shortDesc: productInfo.desc || "",
                specialFeatures: productInfo.specialFeatures,
              }}
            />
          </div>
        </div>
        <div className="w-full h-auto flex gap-12 mt-10">
          <div className="w-full flex flex-col">
            {/* ----------------- SPECIFICATION SECTION ----------------- */}
            <div className="w-full mb-[100px]">
              <h2 className="font-light block text-2xl text-gray-900 py-5 border-b border-gray-300">Specification</h2>
              {/* keyed by product so collapsed groups reset when moving to another product */}
              <ProductSpecs key={productInfo.id} specifications={productInfo.specifications} />
            </div>

            {/* ----------------- USER REVIEWS ----------------- */}
            <div className="flex flex-col w-full h-auto">
              <div className="flex justify-between items-center pb-4 border-b border-gray-300">
                <h2 className="font-light block text-2xl text-gray-900">User Reviews</h2>
                <button className="text-sm text-gray-900 px-6 py-1.5 rounded-md bg-gray-100 border border-gray-700 hover:bg-gray-200 active:bg-light-300">
                  New Review
                </button>
              </div>
              <div className="flex flex-col w-full">
                <div className="flex items-center flex-wrap w-full mt-5 text-sm">
                  <div className="flex h-8 items-center text-gray-800 font-medium">
                    <Image
                      src={"/images/images/defaultUser.png"}
                      className="rounded-full overflow-hidden mr-3"
                      alt=""
                      width={32}
                      height={32}
                    />
                    <span>T. Mihai</span>
                  </div>
                  <span className="text-[#f97a1f] ml-8 font-medium">Verified Purchase</span>
                  <div>
                    <div className="inline-block ml-8 pl-6 bg-[url('/icons/dateIcon.svg')] bg-no-repeat bg-[position:left_center]">
                      30 November 2023
                    </div>
                    <div className="ml-10 inline-block">
                      <button
                        type="button"
                        aria-label="Helpful"
                        className="mr-2 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 font-medium text-gray-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <ThumbsUp className="size-4" /> 0
                      </button>
                      <button
                        type="button"
                        aria-label="Not helpful"
                        className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 font-medium text-gray-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                      >
                        <ThumbsDown className="size-4" /> 0
                      </button>
                    </div>
                  </div>
                </div>
                <div className="my-4 ml-12 text-sm leading-5 text-gary-900">
                  <span>
                    {`Lorem ipsum dolor sit amet consectetur adipisicing elit.
                    Temporibus suscipit debitis reiciendis repellendus! Repellat rem beatae quo quis
                    tenetur. Culpa quae ratione delectus id odit in nesciunt saepe pariatur vitae.`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="w-full my-[100px]">
          <h2 className="font-light block text-2xl text-gray-900">Similar Products</h2>
          <div className="flex justify-between gap-3.5 w-full overflow-x-scroll pb-2">
            {TopProducts.map((product, index) => (
              <ProductCard
                key={index}
                imgUrl={product.imgUrl}
                name={product.name}
                price={product.price}
                specs={product.specs}
                url={product.url}
                dealPrice={product.dealPrice}
                staticWidth
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;
